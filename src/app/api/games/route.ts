import { prisma } from "@/lib/db";
import { serializeGame } from "@/lib/serializers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const platform = request.nextUrl.searchParams.get("platform")?.trim();
  const sort = request.nextUrl.searchParams.get("sort") === "scan" ? "scan" : "modified";

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
    orderBy:
      sort === "scan"
        ? [{ updatedAt: "desc" }, { title: "asc" }]
        : [{ fileModifiedAt: "desc" }, { title: "asc" }],
    take: 500,
  });

  return NextResponse.json(games.map(serializeGame));
}
