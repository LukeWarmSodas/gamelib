import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { findGameByRouteParam } from "@/lib/game-route";
import { RematchGameButton } from "@/components/rematch-game-button";
import { ManualRemapForm } from "@/components/manual-remap-form";
import { VersionSelect } from "@/components/version-select";

type Params = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

function normalizeGroupTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\b(deluxe|ultimate|premium|complete|edition|early access)\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function prettyDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function GameDetailPage({ params }: Params) {
  const param = (await params).id;
  const game = await findGameByRouteParam(param);

  if (!game) {
    notFound();
  }

  if (game.steamAppId && param !== game.steamAppId) {
    redirect(`/games/${game.steamAppId}`);
  }

  const cover = game.artworks.find((a) => a.type === "cover");
  const backdrop = game.artworks.find((a) => a.type === "backdrop");
  const versionsRaw = await prisma.game.findMany({
    where: {
      platform: game.platform,
      ...(game.steamAppId ? { steamAppId: game.steamAppId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      relativePath: true,
      updatedAt: true,
      steamAppId: true,
    },
  });
  const versions = game.steamAppId
    ? versionsRaw
    : versionsRaw.filter(
        (v) => normalizeGroupTitle(v.title) === normalizeGroupTitle(game.title),
      );

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-8">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Back to library
      </Link>

      <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-panel">
        <div className="relative h-64 bg-black/40 md:h-80">
          {backdrop ? (
            <Image
              src={backdrop.url}
              alt={`${game.title} backdrop`}
              className="h-full w-full object-cover"
              fill
              unoptimized
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">{game.platform}</p>
            <h1 className="text-3xl font-semibold">{game.title}</h1>
          </div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[220px_1fr]">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {cover ? (
              <Image
                src={cover.url}
                alt={`${game.title} cover`}
                className="h-full w-full object-cover"
                width={400}
                height={560}
                unoptimized
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center text-sm text-muted">
                No cover art
              </div>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted">{game.description ?? "No description yet. Update from metadata editor soon."}</p>
            <VersionSelect
              currentGameId={game.id}
              versions={versions.map((version) => ({
                id: version.id,
                steamAppId: version.steamAppId,
                relativePath: version.relativePath,
                updatedAt: version.updatedAt.toISOString(),
              }))}
            />
            <RematchGameButton gameId={game.id} />
            <ManualRemapForm
              gameId={game.id}
              initialValue={game.manualMapTitle}
              currentTitle={game.title}
            />
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <dt className="text-muted">Platform</dt>
                <dd>{game.platform}</dd>
              </div>
              <div>
                <dt className="text-muted">Release Year</dt>
                <dd>{game.releaseYear ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-muted">Genres</dt>
                <dd>{game.genres ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-muted">Steam App ID</dt>
                <dd>{game.steamAppId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Metadata Source</dt>
                <dd>{game.metadataSource ?? "None"}</dd>
              </div>
              <div>
                <dt className="text-muted">Last Query Used</dt>
                <dd>{game.lastQueryUsed ?? "N/A"}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-muted">Manual Map Title</dt>
                <dd>{game.manualMapTitle ?? "None"}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-muted">File</dt>
                <dd className="break-all">{game.relativePath}</dd>
              </div>
              <div>
                <dt className="text-muted">Last Indexed</dt>
                <dd>{prettyDate(game.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
