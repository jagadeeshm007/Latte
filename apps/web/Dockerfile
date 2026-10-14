# Build the static bundle, then serve it with an unprivileged nginx.
FROM node:24-alpine AS build
WORKDIR /src
RUN corepack enable
# pnpm-lock.yaml is committed (make setup writes it); the glob keeps a first
# build working before it exists, at the cost of an unpinned resolution.
COPY package.json pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    else echo "lockfile: none committed, installing unfrozen (run pnpm install and commit pnpm-lock.yaml)"; pnpm install; fi
COPY . .
# VITE_ variables are inlined at build time and are public. Never a secret here.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
