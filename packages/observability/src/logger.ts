import pino, { type DestinationStream, type Logger } from 'pino';

const sensitiveName = /password|token|secret|credential|apikey/i;

function redactRecord(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactRecord);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    output[key] = sensitiveName.test(key) ? '[Redacted]' : redactRecord(nested);
  }
  return output;
}

let logger: Logger | undefined;

export function createLogger(serviceName: string, stream?: DestinationStream): Logger {
  return pino(
    {
      name: serviceName,
      level: 'info',
      redact: {
        paths: ['password', 'token', 'secret', 'credential', 'apiKey', 'authorization'],
        censor: '[Redacted]',
      },
      formatters: {
        log(object) {
          return redactRecord(object) as Record<string, unknown>;
        },
      },
    },
    stream,
  );
}

export function initLogger(serviceName: string): Logger {
  logger = createLogger(serviceName);
  return logger;
}

export function getLogger(): Logger {
  logger ??= createLogger('foundry');
  return logger;
}
