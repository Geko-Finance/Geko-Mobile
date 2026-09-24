# Geko backend production image. Build from the monorepo root so the root lockfile is in
# the context:
#
#   docker build -f apps/backend/Dockerfile -t geko-backend .
#
# The container applies pending migrations, then starts the API. Set RUN_MIGRATIONS=false
# to skip that step when migrations run elsewhere (e.g. a platform pre-deploy command
# running `npm run migrate:prod --workspace=geko-backend`).

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /repo
# npm ci checks the lockfile against every workspace manifest, so all of them are copied,
# but only the backend's dependencies are installed.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/mobile/package.json apps/mobile/
COPY packages/defindex-vault/package.json packages/defindex-vault/
RUN npm ci --workspace=geko-backend --include-workspace-root=false

FROM deps AS build
COPY apps/backend apps/backend
RUN npm run build --workspace=geko-backend \
  && npm prune --omit=dev --workspace=geko-backend --include-workspace-root=false \
  && mkdir -p apps/backend/node_modules

FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production \
  PORT=4000 \
  RUN_MIGRATIONS=true
# The lockfile nests some backend dependencies under apps/backend/node_modules (versions
# that conflict with the hoisted copy), so the runtime keeps the monorepo layout for
# Node's module resolution to find both.
WORKDIR /repo/apps/backend
COPY --from=build --chown=node:node /repo/node_modules /repo/node_modules
COPY --from=build --chown=node:node /repo/apps/backend/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/backend/package.json ./package.json
COPY --from=build --chown=node:node /repo/apps/backend/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" != \"false\" ]; then node dist/db/migrate.js || exit 1; fi; exec node dist/main.js"]
