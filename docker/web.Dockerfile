# CI builds linux/arm64 for Graviton (10 §4). Local `docker build` uses the host platform.
FROM node:24-bookworm-slim AS deps
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
RUN pnpm fetch

FROM deps AS build
WORKDIR /repo
COPY . .
# pnpm's isolated linker leaves Next standalone missing nested deps such as @swc/helpers.
RUN printf '\nnode-linker=hoisted\n' >> .npmrc
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm install --offline --frozen-lockfile \
  && pnpm turbo run build --filter=@foundry/web... \
  && pnpm --filter @foundry/db deploy --prod --legacy /opt/migrate

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
COPY --from=build --chown=node:node /opt/migrate ./migrate
COPY --chown=node:node docker/web-entrypoint.mjs ./docker/web-entrypoint.mjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["node", "docker/web-entrypoint.mjs"]
CMD ["node", "apps/web/server.js"]
