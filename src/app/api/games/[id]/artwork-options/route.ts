import { findGameByRouteParam } from "@/lib/game-route";
import { listArtworkOptionsForGame } from "@/lib/metadata/artwork-options";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const game = await findGameByRouteParam(id);
  if (!game) {
    return NextResponse.json({ message: "Game not found" }, { status: 404 });
  }
  const options = await listArtworkOptionsForGame({
    title: game.title,
    manualMapTitle: game.manualMapTitle,
    steamAppId: game.steamAppId,
  });
  return NextResponse.json({ gameId: game.id, options });
}
