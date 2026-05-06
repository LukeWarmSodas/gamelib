"use client";

import { useState } from "react";

type Props = {
  gameId: string;
  initialValue?: string | null;
  currentTitle: string;
};

type Candidate = {
  title: string;
  source: "igdb" | "steam";
  coverUrl?: string;
  year?: number;
  steamAppId?: string;
};

export function ManualRemapForm({ gameId, initialValue, currentTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue ?? "");
  const [query, setQuery] = useState(initialValue ?? currentTitle);
  const [running, setRunning] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Candidate[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (payload: { title: string; steamAppId?: string }) => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/games/${gameId}/manual-map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? "failed");
      }
      setMessage("Manual map applied.");
      window.location.reload();
    } catch (error) {
      setMessage(`Manual map failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      setRunning(false);
    }
  };

  const search = async () => {
    setSearching(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/metadata/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("search failed");
      const data = (await res.json()) as Candidate[];
      setResults(data);
      if (data.length === 0) {
        setMessage("No candidates found.");
      }
    } catch {
      setMessage("Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const clear = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/games/${gameId}/manual-map`, { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? "failed");
      }
      setValue("");
      setMessage("Manual map cleared.");
      window.location.reload();
    } catch (error) {
      setMessage(`Clear failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-black/25 p-5 shadow-inner shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-faint">
            Manual mapping
          </p>
          <p className="mt-1 text-xs text-muted">
            Search IGDB / Steam, or type a custom query title.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl border border-border-bright bg-white/[0.06] px-4 py-2 text-xs font-semibold transition-colors hover:border-accent/35 hover:bg-white/[0.09]"
        >
          {open ? "Collapse" : "Edit"}
        </button>
      </div>
      {open ? (
        <div className="mt-5 space-y-4 border-t border-border pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title…"
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
            <button
              type="button"
              onClick={() => void clear()}
              disabled={running}
              className="rounded-xl border border-border-bright px-4 py-2.5 text-xs font-medium text-muted transition-colors hover:border-red-400/40 hover:text-red-300 disabled:opacity-45"
            >
              Clear
            </button>
          </div>
          <div className="max-h-56 space-y-2 overflow-auto rounded-xl border border-border bg-black/20 p-2">
            {results.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-faint">Results appear here.</p>
            ) : null}
            {results.map((result) => (
              <button
                key={`${result.source}:${result.title}`}
                type="button"
                onClick={() => {
                  setValue(result.title);
                  void save({
                    title: result.title,
                    ...(result.source === "steam" && result.steamAppId
                      ? { steamAppId: result.steamAppId }
                      : {}),
                  });
                }}
                disabled={running}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent bg-white/[0.04] px-3 py-2.5 text-left text-sm transition-all hover:border-accent/35 hover:bg-white/[0.07] disabled:opacity-45"
              >
                <span className="font-medium text-foreground">{result.title}</span>
                <span className="shrink-0 rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {result.source}
                  {result.year ? ` · ${result.year}` : ""}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Custom manual title…"
              className="min-w-[200px] flex-1 rounded-xl border border-border-bright bg-black/35 px-4 py-2.5 text-sm outline-none ring-offset-background placeholder:text-muted-faint focus:border-accent/45 focus:ring-2 focus:ring-accent/25"
            />
            <button
              type="button"
              onClick={() => void save({ title: value })}
              disabled={running || !value.trim()}
              className="rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/20 ring-1 ring-white/10 transition-all hover:bg-accent/90 disabled:opacity-45"
            >
              Save &amp; rematch
            </button>
          </div>
        </div>
      ) : null}
      {message ? <p className="mt-4 text-xs text-muted">{message}</p> : null}
    </div>
  );
}
