# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Install deps: use npm ci if lockfile exists, else npm install
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Build the SPA with the API base injected by compose (default=/api)
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=${VITE_API_BASE}
COPY . .
RUN npm run build

# --- serve stage ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
