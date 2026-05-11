import fs from "node:fs/promises";
import path from "node:path";
import type { Stats } from "node:fs";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { enrichGameMetadata } from "@/lib/metadata/providers";
import { syncGameArtworks } from "@/lib/metadata/sync-artworks";

/** Only these file types are indexed as games (directories are never games). */
const ARCHIVE_EXTENSIONS = new Set([
  ".zip",
  ".7z",
  ".rar",
  ".iso",
  ".cso",
  ".chd",
  ".rvz",
]);

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

export type ScanStats = {
  filesSeen: number;
  gamesUpsert: number;
  gamesSkipped: number;
  errors: number;
};

export type ScanOptions = {
  /** Re-fetch metadata and art for every release even if filesystem + manual map unchanged */
  force?: boolean;
};

function inferPlatform(relativePath: string): string {
  const parts = relativePath.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 1) {
    return "PC";
  }
  return parts[0];
}

async function assertLibraryRootReadable(root: string): Promise<void> {
  try {
    const st = await fs.stat(root);
    if (!st.isDirectory()) {
      throw new Error(
        `LIBRARY_ROOT must be a directory: ${root}\nUse a folder that contains your releases (e.g. Z:\\Games), not a single file.`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("LIBRARY_ROOT must")) {
      throw e;
    }
    const win = process.platform === "win32";
    const code =
      e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "error";
    const lines = [
      `Cannot read library folder: ${root}`,
      e instanceof Error ? `(${code}: ${e.message})` : String(e),
    ];
    if (win) {
      lines.push(
        "",
        "On Windows, drive letters like Z: are per-user. If Z: works in Explorer but not here:",
        "• Start VS Code / the terminal from the same Windows account where the drive is mapped, then run `npm run dev` again.",
        "• Or avoid mapped letters: set LIBRARY_ROOT to a UNC path, e.g. LIBRARY_ROOT=\\\\YourNAS\\games",
        "• Or use a local path such as C:\\Games",
      );
    } else {
      lines.push("", "Check that the path exists and the process can read it.");
    }
    throw new Error(lines.join("\n"));
  }
}

/** Detect added/changed releases (mtime + size + manual mapping fields). */
function computeScanContentKey(
  stat: Stats,
  manualMapTitle: string | null,
  manualSteamAppId: string | null,
): string {
  const dir = stat.isDirectory();
  const sizePart = dir ? 0 : stat.size;
  return `${Math.trunc(stat.mtimeMs)}:${sizePart}:${manualMapTitle ?? ""}:${manualSteamAppId ?? ""}`;
}

/** Archives only in the library root — subdirectories are not scanned. */
async function collectRootArchivesOnly(root: string, collector: string[]) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (isLikelyInstallerPart(entry.name)) {
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!ARCHIVE_EXTENSIONS.has(ext)) {
      continue;
    }
    collector.push(path.join(root, entry.name));
  }
}

let scanInFlight: Promise<ScanStats> | null = null;

export async function runScan(options?: ScanOptions): Promise<ScanStats> {
  if (scanInFlight) {
    return scanInFlight;
  }
  scanInFlight = runScanInternal(options).finally(() => {
    scanInFlight = null;
  });
  return scanInFlight;
}

async function runScanInternal(options?: ScanOptions): Promise<ScanStats> {
  const force = Boolean(options?.force);
  const startedAt = new Date();
  const scanJob = await prisma.scanJob.create({
    data: { status: "running", startedAt },
  });

  const stats: ScanStats = { filesSeen: 0, gamesUpsert: 0, gamesSkipped: 0, errors: 0 };
  const root = getConfig().libraryRoot;
  const releases: string[] = [];

  try {
    await assertLibraryRootReadable(root);
    await collectRootArchivesOnly(root, releases);
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
          select: {
            id: true,
            manualMapTitle: true,
            manualSteamAppId: true,
            scanContentKey: true,
          },
        });

        const manualMapTitle = existing?.manualMapTitle ?? null;
        const manualSteamAppId = existing?.manualSteamAppId ?? null;
        const contentKey = computeScanContentKey(stat, manualMapTitle, manualSteamAppId);

        if (!force && existing && existing.scanContentKey === contentKey) {
          await prisma.game.update({
            where: { id: existing.id },
            data: { lastSeenAt: now },
          });
          stats.gamesSkipped += 1;
          continue;
        }

        const querySource = manualMapTitle?.trim() || fileName;
        const metadata = await enrichGameMetadata(querySource, {
          steamAppId: manualSteamAppId ?? undefined,
        });
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
            scanContentKey: contentKey,
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
            scanContentKey: contentKey,
            lastSeenAt: now,
          },
        });

        await syncGameArtworks(game.id, metadata.title, {
          coverUrl: metadata.coverUrl,
          backdropUrl: metadata.backdropUrl,
        });

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
        gamesSkipped: stats.gamesSkipped,
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
        gamesSkipped: stats.gamesSkipped,
        errors: stats.errors + 1,
        message: error instanceof Error ? error.message : "Unknown scan failure",
      },
    });
    throw error;
  }

  return stats;
}
