import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { enrichGameMetadata } from "@/lib/metadata/providers";

const GAME_EXTENSIONS = new Set([
  ".zip",
  ".7z",
  ".iso",
  ".chd",
  ".cue",
  ".nes",
  ".sfc",
  ".smc",
  ".gba",
  ".gb",
  ".gbc",
  ".n64",
  ".z64",
  ".v64",
  ".nds",
  ".3ds",
  ".psx",
  ".pbp",
  ".cso",
  ".rvz",
]);

const ARCHIVE_EXTENSIONS = new Set([".zip", ".7z", ".rar", ".iso", ".cso", ".chd", ".rvz"]);

function isRepackFileName(name: string) {
  const lower = name.toLowerCase();
  if (lower === "setup.exe") return true;
  if (/^setup([ ._-]|$)/.test(lower)) return true;
  if (lower === "goggame-setup.exe") return true;
  if (lower.endsWith(".doi")) return true;
  if (lower.endsWith(".fg") || lower.includes(".fg-")) return true;
  if (lower.startsWith("fg-")) return true;
  return false;
}

function isLikelyInstallerPart(name: string) {
  const lower = name.toLowerCase();
  if (isRepackFileName(lower)) return true;
  if (lower.endsWith(".md5") || lower.endsWith(".sfv") || lower.endsWith(".nfo")) return true;
  if (/\.r\d{2,3}$/.test(lower)) return true;
  if (/\.(\d{3}|part\d+)$/i.test(lower)) return true;
  return false;
}

type ScanStats = {
  filesSeen: number;
  gamesUpsert: number;
  errors: number;
};

function inferPlatform(relativePath: string): string {
  const parts = relativePath.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 1) {
    return "PC";
  }
  return parts[0];
}

async function walk(dir: string, root: string, collector: string[]) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const isRoot = path.resolve(dir) === path.resolve(root);

  const fileEntries = entries.filter((e) => e.isFile());
  const hasArchiveInside = fileEntries.some((file) =>
    ARCHIVE_EXTENSIONS.has(path.extname(file.name).toLowerCase()),
  );
  const hasSceneMarker = fileEntries.some((file) =>
    /^sfv|^nfo|^proof/i.test(path.basename(file.name, path.extname(file.name))),
  );
  const hasRepackMarker = fileEntries.some((file) => isRepackFileName(file.name));
  const hasSubdirs = entries.some((e) => e.isDirectory());

  // Treat release folders as a single library item and do not descend.
  if (!isRoot && (hasArchiveInside || hasSceneMarker || hasRepackMarker) && fileEntries.length > 0) {
    collector.push(dir);
    return;
  }

  // Single-level folder releases without nested folders should count as one release.
  if (!isRoot && !hasSubdirs && fileEntries.length > 0) {
    collector.push(dir);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, root, collector);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (isLikelyInstallerPart(entry.name)) {
      continue;
    }
    if (GAME_EXTENSIONS.has(ext)) {
      collector.push(fullPath);
      continue;
    }

    // Treat .bin as a game file only when it appears to be paired with a .cue image.
    if (ext === ".bin") {
      const baseName = path.basename(entry.name, ext);
      const cueMatch = entries.some(
        (e) => e.isFile() && path.basename(e.name, path.extname(e.name)) === baseName && path.extname(e.name).toLowerCase() === ".cue",
      );
      if (cueMatch) {
        collector.push(fullPath);
      }
    }
  }
}

export async function runScan(): Promise<ScanStats> {
  const startedAt = new Date();
  const scanJob = await prisma.scanJob.create({
    data: { status: "running", startedAt },
  });

  const stats: ScanStats = { filesSeen: 0, gamesUpsert: 0, errors: 0 };
  const root = getConfig().libraryRoot;
  const releases: string[] = [];

  try {
    await walk(root, root, releases);
    const now = new Date();
    stats.filesSeen = releases.length;

    for (const releasePath of releases) {
      try {
        const rel = path.relative(root, releasePath);
        const stat = await fs.stat(releasePath);
        const isDirectoryRelease = stat.isDirectory();
        const ext = isDirectoryRelease ? ".dir" : path.extname(releasePath).toLowerCase();
        const fileName = path.basename(releasePath);
        const platform = inferPlatform(rel);
        const existing = await prisma.game.findUnique({
          where: { filePath: releasePath },
          select: { manualMapTitle: true, manualSteamAppId: true },
        });
        const querySource = existing?.manualMapTitle?.trim() || fileName;
        const metadata = await enrichGameMetadata(querySource);
        const relSlug = rel.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        const slug = `${platform}-${metadata.title}-${relSlug}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 150);

        const game = await prisma.game.upsert({
          where: { filePath: releasePath },
          update: {
            title: metadata.title,
            slug,
            platform,
            relativePath: rel,
            extension: ext,
            fileSizeBytes: isDirectoryRelease ? null : BigInt(stat.size),
            releaseYear: metadata.releaseYear,
            genres: metadata.genres?.join(", "),
            description: metadata.description,
            metadataSource: metadata.provider,
            lastQueryUsed: metadata.queryUsed,
            steamAppId: metadata.steamAppId ?? null,
            steamTitle: metadata.steamTitle ?? null,
            lastSeenAt: now,
          },
          create: {
            title: metadata.title,
            slug,
            platform,
            filePath: releasePath,
            relativePath: rel,
            extension: ext,
            fileSizeBytes: isDirectoryRelease ? null : BigInt(stat.size),
            releaseYear: metadata.releaseYear,
            genres: metadata.genres?.join(", "),
            description: metadata.description,
            metadataSource: metadata.provider,
            lastQueryUsed: metadata.queryUsed,
            steamAppId: metadata.steamAppId ?? null,
            steamTitle: metadata.steamTitle ?? null,
            manualMapTitle: existing?.manualMapTitle ?? null,
            manualSteamAppId: existing?.manualSteamAppId ?? null,
            lastSeenAt: now,
          },
        });

        if (metadata.coverUrl) {
          await prisma.artwork.upsert({
            where: {
              gameId_type: { gameId: game.id, type: "cover" },
            },
            update: { url: metadata.coverUrl, isPrimary: true },
            create: {
              gameId: game.id,
              type: "cover",
              url: metadata.coverUrl,
              isPrimary: true,
            },
          });
        } else {
          await prisma.artwork.deleteMany({
            where: { gameId: game.id, type: "cover" },
          });
        }

        if (metadata.backdropUrl) {
          await prisma.artwork.upsert({
            where: {
              gameId_type: { gameId: game.id, type: "backdrop" },
            },
            update: { url: metadata.backdropUrl },
            create: {
              gameId: game.id,
              type: "backdrop",
              url: metadata.backdropUrl,
            },
          });
        } else {
          await prisma.artwork.deleteMany({
            where: { gameId: game.id, type: "backdrop" },
          });
        }

        stats.gamesUpsert += 1;
      } catch {
        stats.errors += 1;
      }
    }

    await prisma.game.deleteMany({
      where: { lastSeenAt: { lt: startedAt } },
    });

    await prisma.scanJob.update({
      where: { id: scanJob.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        filesSeen: stats.filesSeen,
        gamesUpsert: stats.gamesUpsert,
        errors: stats.errors,
      },
    });
  } catch (error) {
    await prisma.scanJob.update({
      where: { id: scanJob.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        filesSeen: stats.filesSeen,
        gamesUpsert: stats.gamesUpsert,
        errors: stats.errors + 1,
        message: error instanceof Error ? error.message : "Unknown scan failure",
      },
    });
    throw error;
  }

  return stats;
}
