export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initObservability } = await import('@foundry/observability/otel');
    const { getEnv } = await import('./lib/env');
    const otlpEndpoint = getEnv().OTEL_EXPORTER_OTLP_ENDPOINT;
    await initObservability({
      serviceName: 'foundry-web',
      ...(otlpEndpoint === undefined ? {} : { otlpEndpoint }),
    });
  }
}
