## GameLib

Self-hosted game library frontend built with Next.js, designed for Linux/NAS Docker deployment with a mounted game folder.

### Features in this MVP
- Fast game browsing from indexed data (SQLite)
- IGDB-backed metadata/art enrichment with fallback metadata
- Manual scan trigger from the UI
- Docker-first runtime model for NAS

## Local development

`npm run dev` works on Windows now with defaults:
- `DATABASE_URL=file:./dev.db`
- `LIBRARY_ROOT=Z:\Games`

If your library is on a different path, create `.env.local` and override:
- `LIBRARY_ROOT="Z:\\YourLibraryFolder"`
- `DATABASE_URL="file:./dev.db"`

Then:
1. Generate Prisma client and push schema:
   - `npm run db:generate`
   - `npm run db:push`
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

## API endpoints

- `GET /api/games` list indexed games
- `GET /api/games/:id` game detail
- `GET /api/scan` latest scan job
- `POST /api/scan` run scanner now
- `POST /api/metadata/rematch` rematch metadata for all indexed games
- `POST /api/games/:id/rematch` rematch one game (supports candidate offset)
- `POST /api/games/:id/manual-map` set manual IGDB query title and rematch
- `DELETE /api/games/:id/manual-map` clear manual title map and rematch

## Notes

- Scanner now treats release **folders** as one item and standalone **archives** as one item.
- Files inside release folders are not indexed as separate games.
- To enable real metadata from IGDB, set:
  - `IGDB_CLIENT_ID`
  - `IGDB_CLIENT_SECRET`
