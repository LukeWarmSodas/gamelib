import Link from "next/link";
import { prisma } from "@/lib/db";
import { ArtworkImage } from "@/components/artwork-image";

export const dynamic = "force-dynamic";

type SortMode = "modified" | "scan";

function normalizeGroupTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\b(deluxe|ultimate|premium|complete|edition|early access)\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatBytes(value: bigint | null): string {
  if (!value) return "Unknown size";
  const bytes = Number(value);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ sort?: string | string[] }>;
}) {
  const params = await searchParams;
  const sort: SortMode = params?.sort === "scan" ? "scan" : "modified";
  const orderBy =
    sort === "scan"
      ? [{ updatedAt: "desc" as const }, { title: "asc" as const }]
      : [{ fileModifiedAt: "desc" as const }, { title: "asc" as const }];

  const [games, scan] = await Promise.all([
    prisma.game.findMany({
      include: { artworks: true },
      orderBy,
      take: 200,
    }),
    prisma.scanJob.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);
  function dedupeKey(g: (typeof games)[number]) {
    return g.steamAppId
      ? `${g.platform}::steam:${g.steamAppId}`
      : `${g.platform}::${normalizeGroupTitle(g.title)}`;
  }

  const grouped = new Map<string, (typeof games)[number]>();
  const versionCounts = new Map<string, number>();
  for (const game of games) {
    const key = dedupeKey(game);
    versionCounts.set(key, (versionCounts.get(key) ?? 0) + 1);
    if (!grouped.has(key)) {
      grouped.set(key, game);
    }
  }
  const dedupedGames = Array.from(grouped.values());

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-16 pt-8 md:px-8 md:pt-10">
      <header className="relative mb-10 overflow-hidden rounded-3xl border border-border-bright bg-panel-solid/90 p-8 shadow-2xl shadow-black/40 md:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
              Library
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-[2.35rem] md:leading-[1.15]">
              Your games, indexed and easy to browse
            </h1>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="rounded-full border border-border-bright bg-white/[0.04] px-3 py-1 text-xs font-medium text-foreground/90">
                {dedupedGames.length} titles
              </span>
              <span className="rounded-full border border-border-bright bg-white/[0.04] px-3 py-1 text-xs text-muted">
                {games.length} indexed releases
              </span>
              {scan ? (
                <span className="rounded-full border border-accent/25 bg-accent-dim px-3 py-1 text-xs font-medium text-accent">
                  Last scan {scan.status} · {scan.gamesUpsert}/{scan.filesSeen}
                  {typeof scan.gamesSkipped === "number" && scan.gamesSkipped > 0
                    ? ` · ${scan.gamesSkipped} skipped`
                    : ""}
                </span>
              ) : (
                <span className="rounded-full border border-border-bright px-3 py-1 text-xs text-muted-faint">
                  No scans yet — run one to populate
                </span>
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">Sort by</span>
            <Link
              href="/"
              aria-current={sort === "modified" ? "page" : undefined}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                sort === "modified"
                  ? "border-accent/35 bg-accent-dim text-accent"
                  : "border-border-bright bg-white/[0.04] text-muted hover:text-foreground"
              }`}
            >
              File modified
            </Link>
            <Link
              href="/?sort=scan"
              aria-current={sort === "scan" ? "page" : undefined}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                sort === "scan"
                  ? "border-accent/35 bg-accent-dim text-accent"
                  : "border-border-bright bg-white/[0.04] text-muted hover:text-foreground"
              }`}
            >
              Last scanned
            </Link>
          </div>
        </div>
      </header>

      {dedupedGames.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-bright bg-panel-solid/40 px-8 py-16 text-center">
          <p className="text-lg font-medium text-foreground">No games yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Open{" "}
            <Link
              href="/settings"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Settings
            </Link>{" "}
            to scan. Put archives in the root of <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs">LIBRARY_ROOT</code> (not in subfolders). Art uses IGDB when configured.
          </p>
        </div>
      ) : (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {dedupedGames.map((game) => {
            const cover = game.artworks.find((a: { type: string }) => a.type === "cover");
            const key = dedupeKey(game);
            const versions = versionCounts.get(key) ?? 1;
            const href = game.steamAppId ? `/games/${game.steamAppId}` : `/games/${game.id}`;
            return (
              <Link
                key={game.steamAppId ?? game.id}
                href={href}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-panel-solid/85 shadow-lg shadow-black/25 ring-1 ring-white/[0.04] transition-all duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-xl hover:shadow-accent/5 hover:ring-accent/20"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-white/[0.06] to-black/50">
                  <ArtworkImage
                    src={cover?.url}
                    alt={game.title}
                    fallbackQuery={game.title}
                    width={400}
                    height={560}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045]"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                  {versions > 1 ? (
                    <span className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/15 backdrop-blur-sm">
                      {versions} versions
                    </span>
                  ) : null}
                </div>
                <div className="relative flex flex-1 flex-col p-3.5 pt-3">
                  <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
                    {game.title}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted">
                    <span className="font-medium text-muted-faint">{game.platform}</span>
                    <span className="mx-1.5 text-border-bright">·</span>
                    {formatBytes(game.fileSizeBytes)}
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
