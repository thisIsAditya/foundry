# DeepSeek Harness adapter

This is an isolated Linux service, deliberately outside the root pnpm workspace.
It pins DeepSeek Harness commit `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`
and exposes only `POST /v1/cofounder/run` to the application worker/runtime.

It does not mount the BusinessGenerator repository, database, object store,
session cookies, raw MCP servers, filesystem tools, terminal tools, persistent
Harness sessions, telemetry, browser capabilities, or a Harness UI. Each
request starts a new Harness process in a temporary directory and deletes that
directory after the process exits.

Required environment:

- `HARNESS_ADAPTER_TOKEN`
- `AWS_REGION` plus `AWS_BEARER_TOKEN_BEDROCK` for the Bedrock Mantle endpoint
- `DSH_MODEL` (defaults to `openai.gpt-5.6-luna`; Mantle uses the model ID
  rather than the `us.` Converse inference-profile prefix)
- `DSH_SDK_CLIENT_PATH` and `DSH_JSONRPC_AGENT_PATH` (provided by the image)

The application sends a bounded context packet and validates the returned
structured result again before persisting a co-founder response or creating a
proposal. Harness never receives database or application credentials.
