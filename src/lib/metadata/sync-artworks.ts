import { prisma } from "@/lib/db";
import { resolveArtworkUrls } from "@/lib/metadata/artwork-fallback";

/** Applies explicit artwork URLs (e.g. user pick from metadata). Omits keys you do not send. */
export async function applyGameArtworkPatch(
  gameId: string,
  patch: { coverUrl?: string | null; backdropUrl?: string | null },
) {
  if ("coverUrl" in patch) {
    const v = patch.coverUrl;
    if (v) {
      await prisma.artwork.upsert({
        where: { gameId_type: { gameId, type: "cover" } },
        update: { url: v, isPrimary: true },
        create: { gameId, type: "cover", url: v, isPrimary: true },
      });
    } else {
      await prisma.artwork.deleteMany({ where: { gameId, type: "cover" } });
    }
  }
  if ("backdropUrl" in patch) {
    const v = patch.backdropUrl;
    if (v) {
      await prisma.artwork.upsert({
        where: { gameId_type: { gameId, type: "backdrop" } },
        update: { url: v },
        create: { gameId, type: "backdrop", url: v },
      });
    } else {
      await prisma.artwork.deleteMany({ where: { gameId, type: "backdrop" } });
    }
  }
}

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
