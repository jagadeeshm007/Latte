# The Latte API image (ADR-0028). One image runs the API, the worker, the
# migrations and the seed; docker-compose.yml picks the command. TypeScript
# runs through tsx, as in development, so there is no separate build step.
FROM node:24-slim AS base
ENV CI=true PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/gateway/package.json packages/gateway/
COPY packages/sdk/package.json packages/sdk/
COPY evals/package.json evals/
RUN pnpm install --frozen-lockfile --prod --filter @scc/api...

FROM base
COPY --from=deps /app /app
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/gateway packages/gateway
COPY apps/api apps/api
RUN mkdir -p /app/.scratch && chown node:node /app/.scratch
USER node
WORKDIR /app/apps/api
ENV NODE_ENV=development
EXPOSE 8080
CMD ["node_modules/.bin/tsx", "src/server.ts"]
