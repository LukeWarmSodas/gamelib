"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type DeleteVersionRow = {
  id: string;
  relativePath: string;
};

function shortPath(value: string) {
  const parts = value.split(/[/\\]/);
  return parts.slice(-2).join("/") || value;
}

type Props = {
  versions: DeleteVersionRow[];
  /** Row currently shown (matches URL / version switcher) */
  currentGameId: string;
};

/**
 * Deletes the chosen archive from disk (under `LIBRARY_ROOT`) and removes its DB row.
 * When several versions exist, pick which file to delete first.
 */
export function DeleteArchiveSection({ versions, currentGameId }: Props) {
  const router = useRouter();
  const [targetId, setTargetId] = useState(currentGameId);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const selected = useMemo(
    () => versions.find((v) => v.id === targetId) ?? versions[0],
    [versions, targetId],
  );

  if (versions.length === 0) {
    return null;
  }

  const runDelete = async () => {
    const pathLabel = selected?.relativePath ?? "";
    if (
      !confirm(
        `Delete this archive from your NAS/library folder and remove it from GameLib?\n\n${pathLabel}\n\nThis cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/games/${targetId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        redirectTo?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.message ?? "Delete failed");
      }
      const to = typeof data.redirectTo === "string" ? data.redirectTo : "/";
      router.push(to);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-950/15 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300/90">
        Remove from library and NAS
      </h2>
      <p className="mt-2 text-sm text-muted">
        Deletes the archive file under your configured library root, then drops this index entry.
        Other versions of the same title stay listed until you delete them too.
      </p>

      {versions.length > 1 ? (
        <div className="mt-4 space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-faint">
            Archive to delete
          </label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border-bright bg-black/35 px-4 py-2.5 text-sm outline-none focus:border-red-400/40"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {shortPath(v.relativePath)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="mt-3 break-all font-mono text-xs text-muted">{selected?.relativePath}</p>
      )}

      <button
        type="button"
        onClick={() => void runDelete()}
        disabled={busy}
        className="mt-4 w-full rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/25 disabled:opacity-50 sm:w-auto"
      >
        {busy ? "Deleting…" : "Delete archive"}
      </button>
      {msg ? <p className="mt-2 text-xs text-red-300">{msg}</p> : null}
    </div>
  );
}
