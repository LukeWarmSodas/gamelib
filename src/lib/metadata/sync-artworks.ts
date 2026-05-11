import { prisma } from "@/lib/db";
import { resolveArtworkUrls } from "@/lib/metadata/artwork-fallback";

export async function syncGameArtworks(
  gameId: string,
  displayTitle: string,
  urls: { coverUrl?: string; backdropUrl?: string },
) {
  const resolved = await resolveArtworkUrls(displayTitle, urls);

  if (resolved.coverUrl) {
    await prisma.artwork.upsert({
      where: { gameId_type: { gameId, type: "cover" } },
      update: { url: resolved.coverUrl, isPrimary: true },
      create: { gameId, type: "cover", url: resolved.coverUrl, isPrimary: true },
    });
  } else {
    await prisma.artwork.deleteMany({ where: { gameId, type: "cover" } });
  }

  if (resolved.backdropUrl) {
    await prisma.artwork.upsert({
      where: { gameId_type: { gameId, type: "backdrop" } },
      update: { url: resolved.backdropUrl },
      create: { gameId, type: "backdrop", url: resolved.backdropUrl },
    });
  } else {
    await prisma.artwork.deleteMany({ where: { gameId, type: "backdrop" } });
  }
}
