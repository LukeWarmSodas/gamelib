import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_TYPES = new Set(["cover", "backdrop"]);

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { type?: string; url?: string };
  const type = body.type?.trim() ?? "";
  const rawUrl = body.url?.trim() ?? "";

  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ message: "Invalid artwork type" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return NextResponse.json({ message: "Invalid artwork URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return NextResponse.json({ message: "Artwork URL must use http or https" }, { status: 400 });
  }

  const game = await prisma.game.findUnique({ where: { id }, select: { id: true } });
  if (!game) {
    return NextResponse.json({ message: "Game not found" }, { status: 404 });
  }

  const saved = await prisma.artwork.upsert({
    where: { gameId_type: { gameId: id, type } },
    update: {
      url: url.toString(),
      ...(type === "cover" ? { isPrimary: true } : {}),
    },
    create: {
      gameId: id,
      type,
      url: url.toString(),
      ...(type === "cover" ? { isPrimary: true } : {}),
    },
  });

  return NextResponse.json(saved);
}
