"use client";

import { useState } from "react";

export function ScanButton() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onScan = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      if (!res.ok) {
        throw new Error("Scan failed");
      }
      const data = (await res.json()) as {
        filesSeen: number;
        gamesUpsert: number;
        errors: number;
      };
      setMessage(`Done: ${data.gamesUpsert}/${data.filesSeen} imported (${data.errors} errors)`);
      window.location.reload();
    } catch {
      setMessage("Scan failed. Check mounts and env config.");
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
        className="w-full rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 ring-1 ring-white/10 transition-all hover:bg-accent/90 hover:shadow-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
      >
        {running ? "Scanning…" : "Scan library"}
      </button>
      {message ? <p className="text-xs leading-snug text-muted">{message}</p> : null}
    </div>
  );
}
