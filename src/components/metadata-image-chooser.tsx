"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Option = {
  id: string;
  label: string;
  source: string;
  coverUrl?: string;
  backdropUrl?: string;
};

type Props = {
  gameId: string;
};

export function MetadataImageChooser({ gameId }: Props) {
  const router = useRouter();
  const [options, setOptions] = useState<Option[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/games/${gameId}/artwork-options`);
      const data = (await res.json()) as { options?: Option[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Failed to load options");
      setOptions(data.options ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
      setOptions([]);
    }
  }, [gameId]);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = async (opt: Option) => {
    setApplyingId(opt.id);
    setMsg(null);
    try {
      const body: { coverUrl?: string; backdropUrl?: string } = {};
      if (opt.coverUrl?.trim()) body.coverUrl = opt.coverUrl.trim();
      if (opt.backdropUrl?.trim()) body.backdropUrl = opt.backdropUrl.trim();
      if (!body.coverUrl && !body.backdropUrl) {
        setMsg("This option has no image URLs.");
        return;
      }
      const res = await fetch(`/api/games/${gameId}/artworks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(err.message ?? "Apply failed");
      setMsg(`Applied: ${opt.label}`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-black/25 p-5 shadow-inner shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-faint">
            Artwork from metadata
          </h2>
          <p className="mt-1 text-xs text-muted">
            Covers from IGDB search hits and images from the linked Steam store page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-border-bright bg-white/[0.06] px-3 py-2 text-xs font-semibold transition-colors hover:border-accent/35"
        >
          Refresh list
        </button>
      </div>

      {loadError ? <p className="mt-3 text-xs text-red-300">{loadError}</p> : null}

      {options === null ? (
        <p className="mt-6 text-center text-sm text-muted">Loading artwork options…</p>
      ) : options.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted">
          No artwork candidates yet. Link a Steam title or set a manual map, then refresh.
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((opt) => (
            <li
              key={opt.id}
              className="flex flex-col overflow-hidden rounded-xl border border-border-bright bg-black/30"
            >
              <div className="relative aspect-[3/4] w-full bg-black/50">
                {opt.coverUrl ? (
                  <img
                    src={opt.coverUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    No cover URL
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="text-xs font-medium leading-snug text-foreground">{opt.label}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-faint">{opt.source}</p>
                <button
                  type="button"
                  onClick={() => void apply(opt)}
                  disabled={Boolean(applyingId)}
                  className="mt-auto rounded-lg border border-accent/40 bg-accent/15 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/25 disabled:opacity-45"
                >
                  {applyingId === opt.id ? "Applying…" : "Use these images"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {msg ? <p className="mt-3 text-xs text-muted">{msg}</p> : null}
    </div>
  );
}
