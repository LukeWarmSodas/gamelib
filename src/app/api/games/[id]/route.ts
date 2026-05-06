import { findGameByRouteParam } from "@/lib/game-route";
import { serializeGame } from "@/lib/serializers";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;

  const game = await findGameByRouteParam(id);

  if (!game) {
    return NextResponse.json({ message: "Game not found" }, { status: 404 });
  }

  return NextResponse.json(serializeGame(game));
}
