FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN chmod +x scripts/docker-start.sh \
  && npm run db:generate \
  && mkdir -p /app/data /app/uploads /app/logs \
  && chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3001
ENV RUN_DB_MIGRATE=true
ENV SQLITE_DATABASE_URL=file:/app/data/dev.db

EXPOSE 3001

CMD ["./scripts/docker-start.sh"]
