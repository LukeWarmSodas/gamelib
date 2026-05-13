"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArtworkImage } from "@/components/artwork-image";

type Candidate = {
  title: string;
  source: "igdb" | "steam";
  coverUrl?: string;
  backdropUrl?: string;
  year?: number;
};

type Props = {
  gameId: string;
  defaultQuery: string;
  currentCoverUrl?: string | null;
  currentBackdropUrl?: string | null;
};

type ArtworkType = "cover" | "backdrop";

function previewFrameClass(type: ArtworkType) {
  return type === "cover"
    ? "relative aspect-[3/4] overflow-hidden rounded-lg bg-black/30"
    : "relative aspect-[16/9] overflow-hidden rounded-lg bg-black/30";
}

export function MetadataArtworkChooser({
  gameId,
  defaultQuery,
  currentCoverUrl,
  currentBackdropUrl,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState<`${ArtworkType}:${string}` | null>(null);
  const [results, setResults] = useState<Candidate[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const search = async () => {
    setSearching(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/metadata/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("search failed");
      const data = (await res.json()) as Candidate[];
      setResults(data);
      if (!data.some((candidate) => candidate.coverUrl || candidate.backdropUrl)) {
        setMessage("No artwork candidates found.");
      }
    } catch {
      setMessage("Artwork search failed.");
    } finally {
      setSearching(false);
    }
  };

  const applyArtwork = async (type: ArtworkType, url: string, title: string) => {
    const key = `${type}:${url}`;
    setSaving(key);
    setMessage(null);
    try {
      const res = await fetch(`/api/games/${gameId}/artwork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, url }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? res.statusText ?? "save failed");
      }
      setMessage(`Updated ${type} artwork from ${title}.`);
      router.refresh();
    } catch (error) {
      setMessage(`Artwork update failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-black/25 p-5 shadow-inner shadow-black/20">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-faint">
          Artwork
        </p>
        <p className="mt-1 text-xs text-muted">
          Search metadata sources and apply a cover or backdrop image to this game.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          { label: "Current cover", url: currentCoverUrl, type: "cover" as const },
          { label: "Current backdrop", url: currentBackdropUrl, type: "backdrop" as const },
        ].map((item) => (
          <div key={item.type} className="rounded-xl border border-border bg-black/20 p-3">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-faint">
              {item.label}
            </p>
            <div className={previewFrameClass(item.type)}>
              <ArtworkImage
                src={item.url}
                alt={item.label}
                fallbackQuery={defaultQuery}
                {...(item.type === "cover"
                  ? { width: 300, height: 400, className: "h-full w-full object-cover" }
                  : { fill: true, sizes: "(min-width: 768px) 30vw, 100vw", className: "h-full w-full object-cover" })}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artwork…"
          className="min-w-[200px] flex-1 rounded-xl border border-border-bright bg-black/35 px-4 py-2.5 text-sm outline-none ring-offset-background transition-colors placeholder:text-muted-faint focus:border-accent/45 focus:ring-2 focus:ring-accent/25"
        />
        <button
          type="button"
          onClick={search}
          disabled={searching || !query.trim()}
          className="rounded-xl border border-border-bright bg-white/[0.06] px-4 py-2.5 text-xs font-semibold transition-colors hover:border-accent/35 disabled:opacity-45"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {results.length === 0 ? (
          <p className="rounded-xl border border-border bg-black/20 px-3 py-8 text-center text-xs text-muted-faint lg:col-span-2">
            Search results with artwork appear here.
          </p>
        ) : (
          results.map((result) => (
            <div key={`${result.source}:${result.title}`} className="rounded-xl border border-border bg-black/20 p-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{result.title}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">
                    {result.source}
                    {result.year ? ` · ${result.year}` : ""}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-black/30">
                    <ArtworkImage
                      src={result.coverUrl}
                      alt={`${result.title} cover`}
                      fallbackQuery={result.title}
                      width={240}
                      height={320}
                      className="h-full w-full object-cover"
                      placeholder={
                        <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-wide text-muted-faint">
                          No cover
                        </div>
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => result.coverUrl && void applyArtwork("cover", result.coverUrl, result.title)}
                    disabled={!result.coverUrl || saving === `cover:${result.coverUrl}`}
                    className="w-full rounded-xl border border-border-bright bg-white/[0.06] px-4 py-2 text-xs font-semibold transition-colors hover:border-accent/35 disabled:opacity-45"
                  >
                    {saving === `cover:${result.coverUrl}` ? "Saving…" : "Use as cover"}
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-black/30">
                    <ArtworkImage
                      src={result.backdropUrl}
                      alt={`${result.title} backdrop`}
                      fallbackQuery={result.title}
                      fill
                      sizes="(min-width: 1024px) 20vw, 100vw"
                      className="h-full w-full object-cover"
                      placeholder={
                        <div className="absolute inset-0 flex items-center justify-center text-[11px] uppercase tracking-wide text-muted-faint">
                          No backdrop
                        </div>
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      result.backdropUrl && void applyArtwork("backdrop", result.backdropUrl, result.title)
                    }
                    disabled={!result.backdropUrl || saving === `backdrop:${result.backdropUrl}`}
                    className="w-full rounded-xl border border-border-bright bg-white/[0.06] px-4 py-2 text-xs font-semibold transition-colors hover:border-accent/35 disabled:opacity-45"
                  >
                    {saving === `backdrop:${result.backdropUrl}` ? "Saving…" : "Use as backdrop"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {message ? <p className="mt-4 text-xs text-muted">{message}</p> : null}
    </div>
  );
}
