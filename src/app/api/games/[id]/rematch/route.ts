import { rematchSingleGame } from "@/lib/metadata/rematch";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { candidateOffset?: number };
  const result = await rematchSingleGame(id, body.candidateOffset ?? 0);

  if (!result) {
    return NextResponse.json({ message: "Game not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
