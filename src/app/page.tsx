import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ScanButton } from "@/components/scan-button";
import { RematchAllButton } from "@/components/rematch-all-button";

export const dynamic = "force-dynamic";

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

export default async function Home() {
  const [games, scan] = await Promise.all([
    prisma.game.findMany({
      include: { artworks: true },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
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
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 md:px-8">
      <header className="mb-8 rounded-2xl border border-white/10 bg-panel p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted">GameLib</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Your library, your way
            </h1>
            <p className="mt-2 text-sm text-muted">
              Indexed from <code className="rounded bg-black/30 px-2 py-0.5">LIBRARY_ROOT</code> for
              fast browsing on NAS.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <RematchAllButton />
            <ScanButton />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted">
          <span>{dedupedGames.length} unique games</span>
          <span>{games.length} files/releases indexed</span>
          {scan ? (
            <span>
              Last scan: {scan.status} ({scan.gamesUpsert}/{scan.filesSeen})
            </span>
          ) : (
            <span>No scans yet</span>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {dedupedGames.map((game) => {
          const cover = game.artworks.find((a) => a.type === "cover");
          const key = dedupeKey(game);
          const versions = versionCounts.get(key) ?? 1;
          const href = game.steamAppId ? `/games/${game.steamAppId}` : `/games/${game.id}`;
          return (
            <Link
              key={game.steamAppId ?? game.id}
              href={href}
              className="group overflow-hidden rounded-xl border border-white/10 bg-panel transition hover:-translate-y-1 hover:border-accent/70"
            >
              <div className="aspect-[3/4] bg-black/40">
                {cover ? (
                  <Image
                    src={cover.url}
                    alt={game.title}
                    className="h-full w-full object-cover"
                    width={400}
                    height={560}
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    No cover
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium">{game.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {game.platform} · {formatBytes(game.fileSizeBytes)}
                </p>
                {versions > 1 ? <p className="text-xs text-muted">{versions} versions</p> : null}
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
