import { Prisma } from "@prisma/client";
import { findGameByRouteParam } from "@/lib/game-route";
import { deleteGameArchiveById } from "@/lib/delete-game-archive";
import { buildGameSlug } from "@/lib/game-slug";
import { prisma } from "@/lib/db";
import { serializeGame } from "@/lib/serializers";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;

  const game = await findGameByRouteParam(id);

  if (!game) {
    return NextResponse.json({ message: "Game not found" }, { status: 404 });
  }

  return NextResponse.json(serializeGame(game));
}

type PatchBody = {
  title?: string;
  description?: string | null;
  releaseYear?: number | null | string;
  genres?: string | null;
};

/** Updates editable display fields (title, description, year, genres). */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const game = await findGameByRouteParam(id);
  if (!game) {
    return NextResponse.json({ message: "Game not found" }, { status: 404 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const data: Prisma.GameUpdateInput = {};
  if (typeof body.title === "string" && body.title.trim()) {
    const nextTitle = body.title.trim();
    data.title = nextTitle;
    data.slug = buildGameSlug(game.platform, nextTitle, game.relativePath);
  }
  if ("description" in body) {
    data.description =
      body.description === null || body.description === undefined
        ? null
        : String(body.description);
  }
  if ("releaseYear" in body) {
    const ry = body.releaseYear;
    if (ry === null || ry === undefined) {
      data.releaseYear = null;
    } else if (typeof ry === "number" && Number.isFinite(ry)) {
      data.releaseYear = Math.round(ry);
    } else if (typeof ry === "string" && /^\d{1,4}$/.test(ry.trim())) {
      data.releaseYear = parseInt(ry.trim(), 10);
    }
  }
  if ("genres" in body) {
    data.genres =
      body.genres === null || body.genres === undefined
        ? null
        : String(body.genres).trim() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });
  }

  try {
    await prisma.game.update({ where: { id: game.id }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { message: "Slug already taken; try a slightly different title." },
        { status: 409 },
      );
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
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
