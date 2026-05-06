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
    <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">Manual title remap</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-white/20 px-3 py-1 text-xs"
        >
          {open ? "Hide Edit" : "Edit Mapping"}
        </button>
      </div>
      {open ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title..."
              className="min-w-[220px] flex-1 rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={search}
              disabled={searching || !query.trim()}
              className="rounded-md border border-white/20 px-3 py-2 text-xs disabled:opacity-60"
            >
              {searching ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              onClick={() => void clear()}
              disabled={running}
              className="rounded-md border border-white/20 px-3 py-2 text-xs disabled:opacity-60"
            >
              Clear
            </button>
          </div>
          <div className="max-h-56 space-y-2 overflow-auto pr-1">
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
                className="flex w-full items-center justify-between rounded-md border border-white/10 bg-black/30 px-3 py-2 text-left text-sm hover:border-accent/60 disabled:opacity-60"
              >
                <span>{result.title}</span>
                <span className="text-xs text-muted">
                  {result.source.toUpperCase()}
                  {result.year ? ` · ${result.year}` : ""}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Or type custom manual title"
              className="min-w-[220px] flex-1 rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => void save({ title: value })}
              disabled={running || !value.trim()}
              className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
            >
              Save + Rematch
            </button>
          </div>
        </>
      ) : null}
      {message ? <p className="text-xs text-muted">{message}</p> : null}
    </div>
  );
}
