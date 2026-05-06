import { prisma } from "@/lib/db";
import { serializeGame } from "@/lib/serializers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const platform = request.nextUrl.searchParams.get("platform")?.trim();

  const games = await prisma.game.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { platform: { contains: search } },
              { relativePath: { contains: search } },
            ],
          }
        : {}),
      ...(platform ? { platform } : {}),
    },
    include: { artworks: true },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    take: 500,
  });

  return NextResponse.json(games.map(serializeGame));
}
