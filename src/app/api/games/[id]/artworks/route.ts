import { findGameByRouteParam } from "@/lib/game-route";
import { applyGameArtworkPatch } from "@/lib/metadata/sync-artworks";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

type Body = {
  coverUrl?: string | null;
  backdropUrl?: string | null;
};

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const game = await findGameByRouteParam(id);
  if (!game) {
    return NextResponse.json({ message: "Game not found" }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const patch: { coverUrl?: string | null; backdropUrl?: string | null } = {};
  if ("coverUrl" in body) {
    if (body.coverUrl === null || (typeof body.coverUrl === "string" && !body.coverUrl.trim())) {
      patch.coverUrl = null;
    } else if (typeof body.coverUrl === "string") {
      patch.coverUrl = body.coverUrl.trim();
    }
  }
  if ("backdropUrl" in body) {
    if (body.backdropUrl === null || (typeof body.backdropUrl === "string" && !body.backdropUrl.trim())) {
      patch.backdropUrl = null;
    } else if (typeof body.backdropUrl === "string") {
      patch.backdropUrl = body.backdropUrl.trim();
    }
  }

  if (!("coverUrl" in patch) && !("backdropUrl" in patch)) {
    return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
  }

  await applyGameArtworkPatch(game.id, patch);
  return NextResponse.json({ ok: true });
}
