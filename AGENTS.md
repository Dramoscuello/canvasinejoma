# AGENTS.md — CanvaInejoma

## Arch overview

- **`backend/`** — Rust (Axum + Tokio) monolithic server
- **`frontend/`** — React 19 + Vite 8 + Fabric.js 7, proxied through Nginx
- **`docker-compose.yml`** — orchestrates Postgres, backend, and frontend (Nginx on port 80)
- The backend stores data **in-memory by default** (HashMaps behind `Arc<Mutex<>>`). It *attempts* to auto-create tables in PostgreSQL if `DATABASE_URL` is set, but **silently falls back** to in-memory mode if the connection fails — no migration framework exists.

## Essential commands

```bash
# Start everything (Docker)
docker-compose up -d --build

# Seed admin user (prints hash to stdout, does NOT insert into DB — in-memory only)
docker-compose exec backend /app/seed

# Frontend dev (standalone, no Docker)
cd frontend && npm run dev       # Vite dev server
cd frontend && npm run build     # production build
cd frontend && npm run lint      # oxlint

# Backend dev (standalone, needs Postgres or falls back to in-memory)
cd backend && cargo run
cd backend && cargo run --bin seed
```

## Backend details

- Two binaries defined in `Cargo.toml`: `canva_inejoma_backend` (port 8000) and `seed` (admin account helper)
- `backend/.env` holds real credentials — it is **gitignored**, never commit it
- `DATABASE_URL` is optional; the server works without Postgres using in-memory stores
- The `seed` binary only **prints** the bcrypt hash of the admin user; it does not persist anything to disk or DB
- Auth: JWT tokens (12h expiry) with a hardcoded fallback secret (`canva_inejoma_secret_jwt_key_2026`) plus env-var fallback
- Admin login: checks in-memory users first, then falls back to `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars
- WebSocket rooms use `tokio::sync::broadcast` channels per `room_code`
- Room codes are 4 alphanumeric characters (a-z, A-Z, 0-9)
- API routes: `POST /api/auth/login`, `POST /api/sessions`, `GET /api/sessions/history`, `GET /api/sessions/:code`, `POST /api/sessions/:code/finish`, `WS /ws/:room_code?role=teacher|student`

## Frontend details

- Linter: **oxlint** (not ESLint). Config in `frontend/.oxlintrc.json`
- Fabric.js v7 for canvas rendering
- Lucide React for icons
- Routes: `/` → StudentJoin, `/login` → Login, `/teacher` → TeacherDashboard, `/r/:code` → StudentView
- WebSocket service (`src/services/websocket.js`) uses `BroadcastChannel` as a **local fallback** when the backend WebSocket is unavailable — this enables same-browser dev testing without the backend running
- Nginx config proxies `/api/` → `backend:8000` and `/ws/` → `backend:8000` with WebSocket upgrade support

## Dev workflow (no Docker)

When developing without Docker Compose, the frontend dev server connects to the backend at the same origin — run both:
1. `cd backend && cargo run` (starts on port 8000)
2. `cd frontend && npm run dev` (Vite dev server)
3. The Vite dev server needs to proxy `/api` and `/ws` to `localhost:8000` — configure `vite.config.js` if needed

## Known quirks

- **No database persistence by default.** Data lives in memory and is lost on backend restart in the default mode. PostgreSQL integration requires the container to be healthy before the backend starts (`depends_on` with `condition: service_healthy`).
- **No test suite.** There are no tests configured for either backend or frontend.
- **No CI/CD.** No GitHub Actions workflows exist.
- The `seed` tool is misleading — it calculates a hash and prints it; it does not seed a database.
- `BroadcastChannel` in the frontend WebSocket service syncs canvas state across browser tabs locally — useful for dev but can be confusing alongside real WebSocket messages.
