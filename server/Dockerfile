FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
COPY scripts ./scripts
RUN mkdir -p uploads/assets
ENV PORT=4000
CMD ["node","src/index.js"]
