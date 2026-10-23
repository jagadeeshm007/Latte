# The local gateway (ADR-0028): nginx serving the built web app and routing
# /api, /auth/v1 and /storage/v1, so everything is on http://localhost:8000.
FROM node:24-slim AS web
ENV CI=true PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/gateway/package.json packages/gateway/
COPY packages/sdk/package.json packages/sdk/
COPY evals/package.json evals/
RUN pnpm install --frozen-lockfile --filter @scc/web...
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
# The web app reads transcripts with the SDK's parser (@latte/sdk/transcript).
COPY packages/sdk packages/sdk
COPY apps/web apps/web
# The public docs, which the build turns into /docs, /llms.txt and /openapi.json.
COPY docs/public docs/public
# Public values only: VITE_ variables are inlined into the bundle.
ARG VITE_SUPABASE_URL=http://localhost:8000
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_API_URL="" VITE_SUPABASE_URL=$VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
RUN pnpm --filter @scc/web build

FROM nginx:1.29-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8000
