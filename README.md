# Silver Cauldron

A personal fork of [Cauldron VTT](https://gitlab.com/hsleisink/cauldron) — a browser-based virtual tabletop for playing pen-and-paper RPGs.

This fork is driven by my own vision of how certain features should work, with a focus on polish and quality-of-life improvements. Development is done in collaboration with AI assistance (Claude).

## What's different from upstream

- **Deterministic dice rolls** — all players see the same 3D dice animation (seeded physics, synced via WebSocket)
- **Node.js WebSocket server** — replaces the original Linux-only C daemon (`cauldrond`), cross-platform and no compilation needed
- **Docker support** — `docker compose up --build` and you're running
- **Modular JS architecture** — the monolithic `adventure.js` (~5600 lines) split into focused modules

## Running locally (Windows)

```bat
start.bat
```

Opens two windows: PHP built-in server at `http://localhost:8080` and Node.js WebSocket at `ws://localhost:8081/websocket`.

Copy `settings/banshee.conf.example` → `settings/banshee.conf` and `settings/cauldron.conf.example` → `settings/cauldron.conf`, then configure your database credentials.

## Running with Docker

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:8080 |
| WebSocket | ws://localhost:8081/websocket |
| MariaDB | localhost:3306 |

Database is initialized automatically from `database/mysql.sql` on first start. To reset: `docker compose down -v`.

## Requirements (native)

- PHP 8.x with `mysqli`, `gd`, `xsl` extensions
- MySQL / MariaDB
- Node.js 18+

---

## О проекте (кратко)

Silver Cauldron — личный форк браузерного VTT [Cauldron](https://gitlab.com/hsleisink/cauldron). Цель — доработка конкретных фич под собственное видение: синхронизированные броски кубиков с 3D-анимацией, кроссплатформенный WebSocket-сервер, Docker-окружение. Разработка ведётся с помощью ИИ (Claude).
