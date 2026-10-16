# syntax=docker/dockerfile:1.7
# One Dockerfile, two targets (PLAN.md §3.5): `web` (Next.js standalone + migrations) and `worker`
# (BullMQ). Built by GitHub Actions and pushed to GHCR – the app VPS only pulls, it never builds.

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

# --- deps -------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- prod-deps (runtime node_modules for the worker, no dev deps) ------
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- build ------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
# Build-time placeholders: `next build` imports server modules (auth, db client) which read the
# environment at module load. Real values are injected by Coolify at runtime; nothing here is baked
# into the bundle (only NEXT_PUBLIC_* variables would be).
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    APP_URL=http://localhost:3000 \
    BETTER_AUTH_SECRET=build-time-placeholder-not-used-at-runtime \
    APP_ENCRYPTION_KEY=build-time-placeholder-not-used-at-runtime \
    DATABASE_URL=postgres://build:build@localhost:5432/build \
    REDIS_URL=redis://localhost:6379
RUN npm run build && npm run worker:build && npm run migrate:build

# --- runtime base -----------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs \
    && mkdir -p /data/uploads && chown -R nextjs:nodejs /data

# --- web ----------------------------------------------------------------
FROM runtime AS web
ENV PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
# Migrations: SQL files + a fully bundled runner (needs no node_modules beyond the standalone ones)
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/dist/migrate.js ./dist/migrate.js
COPY --from=build --chown=nextjs:nodejs /app/docker/entrypoint.sh ./docker/entrypoint.sh
USER nextjs
EXPOSE 3000
CMD ["/app/docker/entrypoint.sh", "web"]

# --- worker -------------------------------------------------------------
FROM runtime AS worker
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nextjs:nodejs /app/dist/worker ./dist/worker
COPY --from=build --chown=nextjs:nodejs /app/docker/entrypoint.sh ./docker/entrypoint.sh
USER nextjs
CMD ["/app/docker/entrypoint.sh", "worker"]
