import { rematchAllGames } from "@/lib/metadata/rematch";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { limit?: number };
  const result = await rematchAllGames(body.limit ?? 2000);
  return NextResponse.json(result);
}
