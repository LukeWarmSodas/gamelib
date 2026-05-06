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
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={rematch}
        disabled={running}
        className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {running ? "Trying..." : "Try Next IGDB Match"}
      </button>
      {message ? <p className="text-xs text-muted">{message}</p> : null}
    </div>
  );
}
