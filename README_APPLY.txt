APPLYING THIS PATCH
====================

These are drop-in files to stabilize your Asset stack:
- CommonJS server (no ESM)
- Auto-seeded admin
- Nginx proxy with /api normalization
- Minimal app endpoints: /api/auth/me and /api/clients

FILES INCLUDED
--------------
docker-compose.yml
client/Dockerfile
client/nginx.conf
server/package.json
server/Dockerfile
server/src/index.js
server/src/authRoutes.js
server/src/db.js
server/src/appRoutes.js

HOW TO APPLY
------------
1) Copy the files into your repo with the same paths.
   Or unzip at the repo root and overwrite existing files.

2) Commit and push:
   git add .
   git commit -m "stabilize: CJS server, /api proxy, seed admin, auth/me & clients"
   git push

3) Rebuild on the host:
   cd /opt/assetdb
   git fetch --all && git checkout main && git pull --ff-only
   docker compose build --no-cache server client
   docker compose up -d --force-recreate

4) Verify:
   curl -sS http://127.0.0.1:4000/api/health
   curl -sS -X POST http://127.0.0.1/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@example.com","password":"TempPass!123"}'

5) Browser login:
   http://<server-ip>/login
   admin@example.com / TempPass!123

NOTES
-----
- docker-compose has healthchecks and auto-seeds admin on first boot.
- Nginx normalizes /api/api/* to /api/* and proxies to server:4000.
- /api/clients is a placeholder returning { items: [] }. Replace later with real data.
