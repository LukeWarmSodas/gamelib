import { prisma } from "@/lib/db";

/** Numeric Steam App IDs only — excludes internal cuids */
export function isSteamAppIdRouteParam(param: string): boolean {
  return /^\d+$/.test(param);
}

export async function findGameByRouteParam(param: string) {
  if (isSteamAppIdRouteParam(param)) {
    const bySteam = await prisma.game.findFirst({
      where: { steamAppId: param },
      include: { artworks: true },
      orderBy: { updatedAt: "desc" },
    });
    if (bySteam) return bySteam;
  }
  return prisma.game.findUnique({
    where: { id: param },
    include: { artworks: true },
  });
}
