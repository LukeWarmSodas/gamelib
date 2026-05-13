import fs from "node:fs/promises";
import type { Game } from "@prisma/client";
import { getConfig } from "@/lib/config";
import { prisma } from "@/lib/db";
import { normalizeGroupTitle } from "@/lib/group-title";
import { isFilePathUnderLibraryRoot } from "@/lib/library-paths";

export async function computeRedirectAfterDelete(deleted: Game): Promise<string> {
  if (deleted.steamAppId) {
    const next = await prisma.game.findFirst({
      where: { steamAppId: deleted.steamAppId, id: { not: deleted.id } },
      orderBy: { updatedAt: "desc" },
    });
    if (next) {
      return next.steamAppId ? `/games/${next.steamAppId}` : `/games/${next.id}`;
    }
  }
  const norm = normalizeGroupTitle(deleted.title);
  const candidates = await prisma.game.findMany({
    where: { platform: deleted.platform, id: { not: deleted.id } },
    orderBy: { updatedAt: "desc" },
  });
  const next = candidates.find((g) => normalizeGroupTitle(g.title) === norm);
  if (next) {
    return next.steamAppId ? `/games/${next.steamAppId}` : `/games/${next.id}`;
  }
  return "/";
}

export type DeleteArchiveResult =
  | { ok: true; redirectTo: string }
  | { ok: false; status: 404 | 400 | 500; message: string };

/** Deletes the archive on disk (must stay under `LIBRARY_ROOT`) then removes the DB row. */
export async function deleteGameArchiveById(gameId: string): Promise<DeleteArchiveResult> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    return { ok: false, status: 404, message: "Game not found" };
  }
  const root = getConfig().libraryRoot;
  if (!isFilePathUnderLibraryRoot(game.filePath, root)) {
    return {
      ok: false,
      status: 400,
      message: "File is outside LIBRARY_ROOT; refusing to delete.",
    };
  }
  const redirectTo = await computeRedirectAfterDelete(game);
  try {
    await fs.unlink(game.filePath);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      return {
        ok: false,
        status: 500,
        message: e instanceof Error ? e.message : "Failed to delete file",
      };
    }
  }
  await prisma.game.delete({ where: { id: game.id } });
  return { ok: true, redirectTo };
}
