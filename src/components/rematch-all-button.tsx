"use client";

import { useState } from "react";

export function RematchAllButton() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onRematch = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/metadata/rematch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 2000 }),
      });
      if (!res.ok) throw new Error("rematch failed");
      const data = (await res.json()) as { total: number; updated: number; failed: number };
      setMessage(`Rematched ${data.updated}/${data.total} (${data.failed} failed)`);
      window.location.reload();
    } catch {
      setMessage("Rematch failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <button
        type="button"
        onClick={onRematch}
        disabled={running}
        className="w-full rounded-xl border border-border-bright bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-foreground shadow-lg shadow-black/20 backdrop-blur-sm transition-all hover:border-accent/35 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
      >
        {running ? "Rematching…" : "Rematch metadata"}
      </button>
      {message ? <p className="text-xs leading-snug text-muted">{message}</p> : null}
    </div>
  );
}
