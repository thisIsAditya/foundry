FROM node:24-bookworm-slim AS harness-build

ARG DSH_COMMIT=b150a551b8d465e31e418e1b2eaf5e79bbb7d28e

RUN apt-get update \
  && apt-get install --no-install-recommends -y git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/harness
RUN git clone https://github.com/deepseek-ai/deepseek-harness.git . \
  && git checkout --detach "${DSH_COMMIT}" \
  && test "$(git rev-parse HEAD)" = "${DSH_COMMIT}"

RUN corepack enable \
  && corepack prepare pnpm@11.7.0 --activate \
  && pnpm install --frozen-lockfile \
  && pnpm run build

FROM node:24-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
ENV DSH_SDK_CLIENT_PATH=/opt/harness/packages/sdk/client/lib/index.js
ENV DSH_JSONRPC_AGENT_PATH=/opt/harness/packages/examples/jsonrpc-demo/lib/packaged-bin.js
ENV DSH_CORDIS_CONFIG=/opt/harness/foundry-cofounder.cordis.yml

COPY --from=harness-build /opt/harness /opt/harness
RUN mkdir -p /opt/harness/node_modules/@deepseek-ai \
  && ln -s ../../packages/sdk/server /opt/harness/node_modules/@deepseek-ai/dsh-sdk-jsonrpc-server \
  && ln -s ../../packages/llm/llm-pi-ai /opt/harness/node_modules/@deepseek-ai/dsh-llm-pi-ai \
  && ln -s ../../packages/examples/agent-spine-demo /opt/harness/node_modules/@deepseek-ai/dsh-agent-spine-demo
COPY package.json ./
COPY src ./src
COPY config/cofounder.cordis.yml /opt/harness/foundry-cofounder.cordis.yml

USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.mjs"]
