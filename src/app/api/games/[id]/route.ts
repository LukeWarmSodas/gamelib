import { findGameByRouteParam } from "@/lib/game-route";
import { deleteGameArchiveById } from "@/lib/delete-game-archive";
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

/**
 * Permanently removes one indexed release: deletes the archive file under `LIBRARY_ROOT`
 * (by absolute `filePath`) then the DB row. **Use internal game `id` (cuid)**, not Steam app id.
 */
export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const result = await deleteGameArchiveById(id);
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
  return NextResponse.json({ ok: true, redirectTo: result.redirectTo });
}
