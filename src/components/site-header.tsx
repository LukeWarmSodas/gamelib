import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-accent/5 ring-1 ring-accent/25 transition-transform duration-300 group-hover:scale-[1.03]"
            aria-hidden
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="text-accent"
              aria-hidden
            >
              <path
                d="M4 8a4 4 0 014-4h8a4 4 0 014 4v8a4 4 0 01-4 4h-3l-2 3-2-3H8a4 4 0 01-4-4V8z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="11" r="1.25" fill="currentColor" />
              <circle cx="12" cy="11" r="1.25" fill="currentColor" />
              <circle cx="15" cy="11" r="1.25" fill="currentColor" />
            </svg>
          </span>
          <span className="text-[15px]">GameLib</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm text-muted">
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            Library
          </Link>
          <Link
            href="/settings"
            className="rounded-lg px-3 py-1.5 transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
