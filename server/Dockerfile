# server/Dockerfile
FROM node:20-alpine

# match the path your logs showed: /app
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# install deps (no lockfile -> use npm install)
COPY package*.json ./
RUN npm install --omit=dev

# app source
COPY src ./src
COPY scripts ./scripts

EXPOSE 4000
CMD ["node", "src/index.js"]
