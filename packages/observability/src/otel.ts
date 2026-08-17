import { initLogger } from './logger.js';

export type ObservabilityOptions = {
  serviceName: string;
  otlpEndpoint?: string;
};

let started = false;

export async function initObservability(options: ObservabilityOptions): Promise<void> {
  if (started) {
    return;
  }
  started = true;
  initLogger(options.serviceName);

  const endpoint = options.otlpEndpoint;
  if (endpoint === undefined) {
    return;
  }

  const [{ NodeSDK }, { getNodeAutoInstrumentations }, { OTLPTraceExporter }] = await Promise.all([
    import('@opentelemetry/sdk-node'),
    import('@opentelemetry/auto-instrumentations-node'),
    import('@opentelemetry/exporter-trace-otlp-http'),
  ]);

  const sdk = new NodeSDK({
    serviceName: options.serviceName,
    traceExporter: new OTLPTraceExporter({
      url: `${endpoint.replace(/\/$/, '')}/v1/traces`,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  await sdk.start();
}
