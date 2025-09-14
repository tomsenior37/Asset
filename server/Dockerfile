# server/Dockerfile
FROM node:20-alpine

# Match the path your logs show (/app)
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install deps first for better caching
COPY package*.json ./
RUN npm ci --omit=dev

# App source
COPY src ./src
COPY scripts ./scripts

EXPOSE 4000
CMD ["node", "src/index.js"]
