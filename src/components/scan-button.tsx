"use client";

import { useState } from "react";

type Props = {
  /** Re-fetch Steam metadata and art for every indexed release (slower). */
  force?: boolean;
  label?: string;
};

export function ScanButton({ force = false, label }: Props) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const defaultLabel = force ? "Full rescan (all games)" : "Scan library";
  const busyLabel = force ? "Rescanning…" : "Scanning…";

  const onScan = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errBody.message ?? `Scan failed (${res.status})`);
      }
      const data = (await res.json()) as {
        filesSeen: number;
        gamesUpsert: number;
        gamesSkipped: number;
        errors: number;
      };
      const parts = [
        `${data.gamesUpsert}/${data.filesSeen} updated`,
        data.gamesSkipped ? `${data.gamesSkipped} skipped (unchanged)` : null,
        `${data.errors} errors`,
      ].filter(Boolean);
      setMessage(`Done: ${parts.join(" · ")}`);
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Scan failed. Check mounts and env config.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <button
        type="button"
        onClick={onScan}
        disabled={running}
        className={
          force
            ? "w-full rounded-xl border border-border-bright bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-foreground shadow-lg shadow-black/20 transition-all hover:border-accent/35 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
            : "w-full rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 ring-1 ring-white/10 transition-all hover:bg-accent/90 hover:shadow-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
        }
      >
        {running ? busyLabel : (label ?? defaultLabel)}
      </button>
      {message ? <p className="text-xs leading-snug text-muted">{message}</p> : null}
    </div>
  );
}
