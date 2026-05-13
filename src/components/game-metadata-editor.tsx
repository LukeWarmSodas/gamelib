"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  gameId: string;
  initial: {
    title: string;
    description: string | null;
    releaseYear: number | null;
    genres: string | null;
  };
};

export function GameMetadataEditor({ gameId, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [releaseYear, setReleaseYear] = useState(
    initial.releaseYear != null ? String(initial.releaseYear) : "",
  );
  const [genres, setGenres] = useState(initial.genres ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        genres: genres.trim() || null,
      };
      const y = releaseYear.trim();
      payload.releaseYear = y === "" ? null : Number.parseInt(y, 10);
      if (y !== "" && !Number.isFinite(payload.releaseYear as number)) {
        setMsg("Release year must be a number.");
        setBusy(false);
        return;
      }

      const res = await fetch(`/api/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(err.message ?? "Save failed");
      setMsg("Saved.");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-black/25 p-5 shadow-inner shadow-black/20">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-faint">
        Display metadata
      </h2>
      <p className="mt-1 text-xs text-muted">
        Edits what GameLib shows for this row. It does not rename files on disk.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-faint">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border-bright bg-black/35 px-4 py-2.5 text-sm outline-none focus:border-accent/45"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-faint">
            Release year
          </span>
          <input
            value={releaseYear}
            onChange={(e) => setReleaseYear(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 2020"
            className="mt-1 w-full rounded-xl border border-border-bright bg-black/35 px-4 py-2.5 text-sm outline-none focus:border-accent/45"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-faint">
            Genres
          </span>
          <input
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            placeholder="Comma-separated"
            className="mt-1 w-full rounded-xl border border-border-bright bg-black/35 px-4 py-2.5 text-sm outline-none focus:border-accent/45"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-faint">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="mt-1 w-full resize-y rounded-xl border border-border-bright bg-black/35 px-4 py-2.5 text-sm leading-relaxed outline-none focus:border-accent/45"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void save()}
        disabled={busy || !title.trim()}
        className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent/90 disabled:opacity-45"
      >
        {busy ? "Saving…" : "Save metadata"}
      </button>
      {msg ? <p className="mt-2 text-xs text-muted">{msg}</p> : null}
    </div>
  );
}
