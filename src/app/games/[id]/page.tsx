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

function genreChips(genres: string | null) {
  if (!genres?.trim()) return null;
  return genres.split(",").map((g) => g.trim()).filter(Boolean);
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

  const genres = genreChips(game.genres);
  const steamStoreUrl = game.steamAppId
    ? `https://store.steampowered.com/app/${game.steamAppId}`
    : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16 pt-6 md:px-8 md:pt-8">
      <Link
        href="/"
        className="group inline-flex items-center gap-2 rounded-full border border-border bg-panel-solid/80 px-4 py-2 text-sm text-muted shadow-sm shadow-black/20 transition-all hover:border-border-bright hover:bg-white/[0.05] hover:text-foreground"
      >
        <span className="transition-transform group-hover:-translate-x-0.5" aria-hidden>
          ←
        </span>
        Library
      </Link>

      <article className="mt-6 overflow-hidden rounded-3xl border border-border-bright bg-panel-solid/90 shadow-2xl shadow-black/35 ring-1 ring-white/[0.04]">
        <div className="relative h-[min(22rem,52vw)] min-h-[220px] w-full overflow-hidden bg-gradient-to-br from-accent/10 via-panel-solid to-black md:h-80">
          {backdrop ? (
            <Image
              src={backdrop.url}
              alt=""
              role="presentation"
              className="h-full w-full object-cover"
              fill
              sizes="100vw"
              priority
              unoptimized
            />
          ) : (
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `radial-gradient(circle at 30% 20%, rgba(118,144,255,0.25), transparent 45%), radial-gradient(circle at 80% 80%, rgba(139,92,246,0.12), transparent 40%)`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-transparent md:via-background/55" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-transparent md:from-background/70" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 md:pl-[calc(11rem+3rem)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-black/40 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted backdrop-blur-md">
                {game.platform}
              </span>
              {game.releaseYear ? (
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-0.5 text-[11px] text-muted backdrop-blur-md">
                  {game.releaseYear}
                </span>
              ) : null}
              {steamStoreUrl ? (
                <a
                  href={steamStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-accent/30 bg-accent-dim px-3 py-0.5 text-[11px] font-medium text-accent backdrop-blur-md transition-colors hover:bg-accent/25"
                >
                  Steam store ↗
                </a>
              ) : null}
            </div>
            <h1 className="mt-4 max-w-4xl text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl md:leading-tight">
              {game.title}
            </h1>
            {genres && genres.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {genres.slice(0, 8).map((g) => (
                  <span
                    key={g}
                    className="rounded-lg border border-border-bright bg-black/35 px-2.5 py-1 text-xs text-muted backdrop-blur-sm"
                  >
                    {g}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-8 p-6 md:grid-cols-[min(220px,40%)_1fr] md:gap-10 md:p-10">
          <div className="mx-auto w-full max-w-[240px] shrink-0 md:mx-0 md:-mt-28 md:max-w-none md:self-start">
            <div className="overflow-hidden rounded-2xl border border-border-bright bg-black/40 shadow-2xl shadow-black/50 ring-2 ring-white/[0.06]">
              {cover ? (
                <Image
                  src={cover.url}
                  alt={`${game.title} cover`}
                  className="aspect-[3/4] h-auto w-full object-cover"
                  width={460}
                  height={690}
                  priority
                  unoptimized
                />
              ) : (
                <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 bg-gradient-to-b from-white/[0.04] to-black/40 p-6 text-center">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted">
                    No cover art
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-8">
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-faint">
                About
              </h2>
              <p className="max-w-prose text-pretty text-[15px] leading-relaxed text-muted md:text-base">
                {game.description ??
                  "No description loaded yet. Use Rematch or edit mapping if this release should match a different Steam title."}
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-black/25 p-5 md:flex-row md:flex-wrap md:items-start md:justify-between">
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
            </div>

            <ManualRemapForm
              gameId={game.id}
              initialValue={game.manualMapTitle}
              currentTitle={game.title}
            />

            <div>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-faint">
                Details
              </h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Platform", game.platform],
                  ["Release year", game.releaseYear ?? "—"],
                  ["Steam App ID", game.steamAppId ?? "—"],
                  ["Metadata source", game.metadataSource ?? "—"],
                  ["Last query", game.lastQueryUsed ?? "—"],
                  ["Manual map title", game.manualMapTitle ?? "—"],
                  ["Last indexed", prettyDate(game.updatedAt)],
                ].map(([label, value]) => (
                  <div
                    key={label as string}
                    className="rounded-xl border border-border bg-white/[0.02] px-4 py-3"
                  >
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-faint">
                      {label}
                    </dt>
                    <dd className="mt-1 break-words text-sm text-foreground/95">{value}</dd>
                  </div>
                ))}
                <div className="rounded-xl border border-border bg-white/[0.02] px-4 py-3 sm:col-span-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-faint">
                    File path
                  </dt>
                  <dd className="mt-1 break-all font-mono text-[13px] text-muted">{game.relativePath}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
