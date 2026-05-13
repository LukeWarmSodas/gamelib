"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

async function fetchRawgUrl(query: string): Promise<string | null> {
  const res = await fetch(`/api/metadata/rawg-cover?q=${encodeURIComponent(query)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { url: string | null };
  return data.url?.trim() || null;
}

type Props = {
  /** Stored cover URL (may fail in browser even if server probe passed) */
  src?: string | null;
  alt: string;
  /** RAWG search query — usually the game title */
  fallbackQuery: string;
  className?: string;
  unoptimized?: boolean;
  priority?: boolean;
  placeholder?: ReactNode;
} & (
  | { fill: true; sizes?: string }
  | { fill?: false; width: number; height: number }
);

/**
 * Cover / hero image: on browser load error, fetches RAWG URL via API and swaps once.
 * If `src` is missing, optionally loads RAWG on mount (`tryRawgWhenMissing` default true when no src).
 */
export function ArtworkImage({
  src: initialSrc,
  alt,
  fallbackQuery,
  className,
  unoptimized = true,
  priority,
  placeholder,
  ...layout
}: Props) {
  const tryRawgWhenMissing = !initialSrc?.trim();
  const [src, setSrc] = useState(initialSrc?.trim() ?? "");
  const [phase, setPhase] = useState<"primary" | "rawg" | "loading" | "failed">(() =>
    initialSrc?.trim() ? "primary" : "loading",
  );
  const fetchingMissing = useRef(false);

  useEffect(() => {
    const next = initialSrc?.trim() ?? "";
    setSrc(next);
    setPhase(next ? "primary" : "loading");
    fetchingMissing.current = false;
  }, [initialSrc]);

  useEffect(() => {
    if (!tryRawgWhenMissing || phase !== "loading" || fetchingMissing.current) return;
    const q = fallbackQuery.trim();
    if (!q) {
      setPhase("failed");
      return;
    }
    fetchingMissing.current = true;
    let cancelled = false;
    void (async () => {
      const url = await fetchRawgUrl(q);
      if (cancelled) return;
      if (url) {
        setSrc(url);
        setPhase("rawg");
      } else {
        setPhase("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tryRawgWhenMissing, phase, fallbackQuery]);

  const onError = useCallback(async () => {
    if (phase === "failed") return;
    if (phase === "rawg" || phase === "loading") {
      setPhase("failed");
      return;
    }
    const q = fallbackQuery.trim();
    if (!q) {
      setPhase("failed");
      return;
    }
    const url = await fetchRawgUrl(q);
    if (url && url !== src) {
      setSrc(url);
      setPhase("rawg");
      return;
    }
    setPhase("failed");
  }, [phase, fallbackQuery, src]);

  if (phase === "failed") {
    return (
      <div
        className={
          "fill" in layout && layout.fill
            ? "absolute inset-0 flex flex-col items-center justify-center"
            : "flex h-full w-full flex-col items-center justify-center"
        }
      >
        {placeholder ?? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-bright bg-white/[0.04] text-muted-faint">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <path d="M4 16l4.5-4.5 3 3L16 9l4 4M5 19h14" />
              </svg>
            </div>
            <span className="mt-2 text-[11px] font-medium uppercase tracking-wider text-muted">
              No cover
            </span>
          </>
        )}
      </div>
    );
  }

  if (phase === "loading" && !src) {
    const fillLoading =
      "fill" in layout && layout.fill ? "absolute inset-0" : "h-full w-full";
    return (
      <div className={`${fillLoading} bg-gradient-to-b from-white/[0.04] to-black/40`} />
    );
  }

  if (!src) {
    return null;
  }

  if ("fill" in layout && layout.fill) {
    return (
      <Image
        key={src}
        src={src}
        alt={alt}
        fill
        sizes={layout.sizes ?? "100vw"}
        className={className}
        unoptimized={unoptimized}
        priority={priority}
        onError={onError}
      />
    );
  }

  const w = "width" in layout ? layout.width : 400;
  const h = "height" in layout ? layout.height : 560;

  return (
    <Image
      key={src}
      src={src}
      alt={alt}
      width={w}
      height={h}
      className={className}
      unoptimized={unoptimized}
      priority={priority}
      onError={onError}
    />
  );
}
