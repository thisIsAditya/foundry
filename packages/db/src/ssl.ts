export type PostgresSslConfig = {
  rejectUnauthorized: boolean;
};

export function sslConfigFromDatabaseUrl(connectionString: string): PostgresSslConfig | undefined {
  const url = new URL(connectionString);
  const mode = url.searchParams.get('sslmode');
  if (mode === 'require' || mode === 'verify-ca' || mode === 'verify-full') {
    return { rejectUnauthorized: true };
  }
  return undefined;
}
