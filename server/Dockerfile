FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# install deps
COPY package*.json ./
RUN npm install --omit=dev

# app source
COPY src ./src

EXPOSE 4000
CMD ["npm", "start"]
