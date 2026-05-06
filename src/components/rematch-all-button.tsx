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
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onRematch}
        disabled={running}
        className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-foreground hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {running ? "Rematching..." : "Rematch Metadata"}
      </button>
      {message ? <p className="text-xs text-muted">{message}</p> : null}
    </div>
  );
}
