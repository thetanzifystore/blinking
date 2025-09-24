# Local dev & test setup (Blinking)

This document provides a single quick path to start Redis and the Firebase emulators needed to run integration and rules tests locally.

Prerequisites
- Docker (or Docker Desktop) installed and running.
- Node.js (v18+), npm, and project devDependencies installed (run `npm ci`).
- firebase-tools installed in devDependencies (this repo pins firebase-tools to 11.x in `package.json`).

Quick start (PowerShell)

```powershell
# From project root
npm ci
# Start local services and emulators (uses docker)
.\scripts\start-local-dev.ps1
# Run integration tests
npm run test:integration
# Run rules tests
npm run test:rules
```

Notes
- The script starts a Redis container (port 6379) and the Firestore/Storage emulators via the local `firebase` CLI.
- If you prefer docker-compose, run `docker-compose up -d` (this repo includes `docker-compose.yml`).
- If you want the Firebase emulator inside Docker, uncomment the `firebase-emulator` service in `docker-compose.yml` and ensure an appropriate image is used.

Env vars
- `REDIS_URL` defaults to `redis://127.0.0.1:6379` — ensure tests pick this up (CI sets it already).
- For emulator-backed tests, set `FIREBASE_PROJECT=demo-project` or adjust to match your firebase.json/project settings.

Troubleshooting
- If the script errors about missing `firebase`, ensure devDependencies are installed and `node_modules/.bin/firebase` exists.
- On Windows, ensure Docker Desktop is running and has enough resources.
