import { applyManualMapping, rematchSingleGame } from "@/lib/metadata/rematch";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      steamAppId?: string;
    };
    const title = body.title?.trim() || null;
    const steamAppId = body.steamAppId?.trim() || null;
    if (!title && !steamAppId) {
      return NextResponse.json(
        { message: "Provide title and/or steamAppId" },
        { status: 400 },
      );
    }

    await applyManualMapping(id, {
      manualMapTitle: title,
      manualSteamAppId: steamAppId,
    });
    const result = await rematchSingleGame(id, 0);
    if (!result) {
      return NextResponse.json({ message: "Game not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "manual remap failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await applyManualMapping(id, {
      manualMapTitle: null,
      manualSteamAppId: null,
    });
    const result = await rematchSingleGame(id, 0);
    if (!result) {
      return NextResponse.json({ message: "Game not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "manual remap clear failed" },
      { status: 500 },
    );
  }
}
