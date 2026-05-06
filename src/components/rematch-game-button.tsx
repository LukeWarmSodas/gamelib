"use client";

import { useState } from "react";

type Props = {
  gameId: string;
};

export function RematchGameButton({ gameId }: Props) {
  const [running, setRunning] = useState(false);
  const [offset, setOffset] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const rematch = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/games/${gameId}/rematch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateOffset: offset }),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { title: string; metadataSource: string; queryUsed?: string };
      setMessage(`Matched "${data.title}" via ${data.metadataSource}${data.queryUsed ? ` (query: ${data.queryUsed})` : ""}`);
      setOffset((value) => value + 1);
      window.location.reload();
    } catch {
      setMessage("Rematch failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex min-w-[200px] flex-1 flex-col items-stretch gap-2 md:max-w-xs md:items-end">
      <button
        type="button"
        onClick={rematch}
        disabled={running}
        className="rounded-xl border border-border-bright bg-white/[0.06] px-4 py-2.5 text-sm font-semibold transition-all hover:border-accent/35 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55"
      >
        {running ? "Searching…" : "Try next Steam match"}
      </button>
      {message ? <p className="text-xs leading-snug text-muted">{message}</p> : null}
    </div>
  );
}
