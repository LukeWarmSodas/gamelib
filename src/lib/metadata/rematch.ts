import path from "node:path";
import { prisma } from "@/lib/db";
import { enrichGameMetadata } from "@/lib/metadata/providers";
import { syncGameArtworks } from "@/lib/metadata/sync-artworks";

function sourceNameFromPath(filePath: string) {
  return path.basename(filePath);
}

export async function rematchSingleGame(gameId: string, candidateOffset = 0) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { artworks: true },
  });
  if (!game) {
    return null;
  }

  const querySource = game.manualMapTitle?.trim() || sourceNameFromPath(game.filePath);
  const metadata = await enrichGameMetadata(querySource, {
    candidateOffset,
    steamAppId: game.manualSteamAppId ?? undefined,
  });

  const updated = await prisma.game.update({
    where: { id: game.id },
    data: {
      title: metadata.title,
      releaseYear: metadata.releaseYear,
      genres: metadata.genres?.join(", "),
      description: metadata.description,
      metadataSource: metadata.provider,
      lastQueryUsed: metadata.queryUsed,
      steamAppId: metadata.steamAppId ?? null,
      steamTitle: metadata.steamTitle ?? null,
    },
  });

  await syncGameArtworks(game.id, metadata.title, {
    coverUrl: metadata.coverUrl,
    backdropUrl: metadata.backdropUrl,
  });

  return {
    id: updated.id,
    title: updated.title,
    metadataSource: updated.metadataSource,
    queryUsed: metadata.queryUsed,
    releaseYear: updated.releaseYear,
    steamAppId: updated.steamAppId,
  };
}

export async function rematchAllGames(limit = 2000) {
  const games = await prisma.game.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  let updated = 0;
  let failed = 0;
  for (const game of games) {
    try {
      await rematchSingleGame(game.id, 0);
      updated += 1;
    } catch {
      failed += 1;
    }
  }

  return { total: games.length, updated, failed };
}

export async function applyManualMapping(
  gameId: string,
  payload: { manualMapTitle: string | null; manualSteamAppId: string | null },
) {
  return prisma.game.update({
    where: { id: gameId },
    data: {
      manualMapTitle: payload.manualMapTitle,
      manualSteamAppId: payload.manualSteamAppId,
    },
  });
}
