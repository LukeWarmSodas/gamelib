## GameLib

Self-hosted game library frontend built with Next.js, designed for Linux/NAS Docker deployment with a mounted game folder.

### Features in this MVP
- Fast game browsing from indexed data (SQLite)
- Steam-backed IDs/text metadata; IGDB-first artwork with RAWG fallback
- Manual scan trigger from the UI
- Docker-first runtime model for NAS

## Local development

`npm run dev` on Windows: if `.env` uses a Docker-style `DATABASE_URL` such as `file:/app/data/gamelib.db`, the app automatically uses **`file:./dev.db`** instead (see `src/lib/db.ts`). **`npm run db:push`** runs Prisma with that same rule so the schema always lands in `dev.db`.

Typical local values:
- `LIBRARY_ROOT=Z:\Games` (or your mount)

If your library is on a different path, override `LIBRARY_ROOT` in `.env`.

Then:
1. Generate Prisma client and push schema:
   - `npm run db:generate`
   - `npm run db:push` (required after pulling schema changes)
   - If `prisma generate` fails with missing `runtime/...wasm` or `library.js`, stop the dev server, run `npm install`, then `npm run db:generate` again. **`prisma` and `@prisma/client` must be the same version** (see `package.json`).
2. Start app:
   - `npm run dev`

Then open [http://localhost:3000](http://localhost:3000).

## Docker / NAS

GitHub Actions (`.github/workflows/docker.yml`) builds and pushes **`linux/amd64`** images to **GHCR**:  
`ghcr.io/<your-github-user-or-org>/<repo-name>` (tags include `latest` on the default branch, plus semver on `v*` tags).

1. On the machine that runs Compose, copy env and fill in values:
   - `cp .env.example .env`
   - `GAMELIB_IMAGE` — must match your GHCR image (for example `ghcr.io/my-org/gamelib:latest`).
   - `LIBRARY_HOST_PATH` — host directory mounted read-only into the container as `/library/games`.
2. If the package is private, log in once: `docker login ghcr.io`
3. Pull and start:
   - `docker compose pull && docker compose up -d`
4. Open:
   - `http://<nas-ip>:3000`

DB and artwork cache live under `./data` next to `docker-compose.yml`.

## Library scans

- **Incremental** (default): metadata and art refresh only when a release’s mtime/size changes or manual mapping changes. Deleted paths are still removed when they disappear from the tree.
- **Full**: `POST /api/scan` with JSON `{ "force": true }`, the **Full rescan** control in Settings, or `npm run scan -- --force`.
- **Daily** (production only): a scan runs about one minute after `next start`, then every 24 hours. Set `SCAN_CRON_DISABLED=1` to disable.
- **Artwork**: IGDB first; **RAWG** (`RAWG_API_KEY`) fills gaps on the server and in the **browser** when an image fails to load (so IGDB CDN quirks still get a second chance). Steam CDN is not used for library images.

## API endpoints

- `GET /api/games` list indexed games
- `GET /api/games/:id` game detail
- `GET /api/scan` latest scan job
- `POST /api/scan` run scanner (JSON body optional: `{ "force": true }` for a full rescan; response includes `gamesSkipped` for incremental runs)
- `POST /api/metadata/rematch` rematch metadata for all indexed games
- `POST /api/games/:id/rematch` rematch one game (supports candidate offset)
- `POST /api/games/:id/manual-map` set manual IGDB query title and rematch
- `DELETE /api/games/:id/manual-map` clear manual title map and rematch

## Notes

- Scanner indexes **archive files only** in the **root** of `LIBRARY_ROOT` (`.zip`, `.7z`, `.rar`, `.iso`, `.cso`, `.chd`, `.rvz`). Subfolders are ignored — put releases flat in that directory (or point `LIBRARY_ROOT` at a flat folder).
- To enable real metadata from IGDB, set:
  - `IGDB_CLIENT_ID`
  - `IGDB_CLIENT_SECRET`
