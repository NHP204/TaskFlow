FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY migrations ./migrations
COPY scripts/migrate.js scripts/seed.js ./scripts/

USER node
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- "http://localhost:${PORT:-3000}/api/v1/health" || exit 1

# Apply pending migrations, then start the API.
CMD ["sh", "-c", "node scripts/migrate.js up && exec node src/server.js"]
