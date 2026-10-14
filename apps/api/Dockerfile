# Build with the dev toolchain, then run the compiled output on a small
# image with only production dependencies, as an unprivileged user.
FROM node:24-alpine AS build
WORKDIR /src
RUN corepack enable
# pnpm-lock.yaml is committed (make setup writes it); the glob keeps a first
# build working before it exists, at the cost of an unpinned resolution.
COPY package.json pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then pnpm fetch && pnpm install --frozen-lockfile --offline; \
    else echo "lockfile: none committed, installing unfrozen (run pnpm install and commit pnpm-lock.yaml)"; pnpm install; fi
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm run build && pnpm prune --prod

FROM node:24-alpine
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /src/package.json ./
COPY --from=build --chown=node:node /src/node_modules ./node_modules
COPY --from=build --chown=node:node /src/dist ./dist
# Migrations are applied by a release step (make migrate against the target
# database), never by the container on boot.
COPY --chown=node:node drizzle ./drizzle
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
CMD ["node", "dist/server.js"]
