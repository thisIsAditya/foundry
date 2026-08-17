export {
  AppError,
  AppErrorCodes,
  isAppError,
  type AppErrorCode,
  type AppErrorInit,
} from './errors.js';
export { createLogger, getLogger, initLogger } from './logger.js';
// `initObservability` (and its transitive @opentelemetry/sdk-node + auto-instrumentation
// deps) lives at the `./otel` subpath, not here. Those deps `require('fs')`/`require('net')`
// etc. at module scope; re-exporting them from this barrel would drag them into any client
// bundle that imports @foundry/api-contracts (which imports AppErrorCodes from here).
export type { ObservabilityOptions } from './otel.js';
