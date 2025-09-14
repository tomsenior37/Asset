# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# deps first (works with or without lockfile)
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# force API base at build-time for Vite
ENV VITE_API_BASE=/api

# app source & build
COPY . .
RUN npm run build

# --- serve stage ---
FROM nginx:alpine
# hardened, rewrite any hard-coded localhost:4000 references in built assets to /api
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
