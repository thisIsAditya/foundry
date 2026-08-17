# CI builds linux/arm64 for Graviton (10 §4). Local `docker build` uses the host platform.
FROM node:24-bookworm-slim AS deps
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
RUN pnpm fetch

FROM deps AS build
WORKDIR /repo
COPY . .
RUN pnpm install --offline --frozen-lockfile \
  && pnpm turbo run build --filter=@foundry/worker... \
  && pnpm --filter @foundry/worker deploy --prod --legacy /opt/worker

FROM node:24-bookworm-slim AS runner
WORKDIR /opt/worker
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
COPY --from=build --chown=node:node /opt/worker ./
COPY --chown=node:node docker/web-entrypoint.mjs ./docker/web-entrypoint.mjs
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["node", "docker/web-entrypoint.mjs"]
CMD ["node", "dist/main.js"]
