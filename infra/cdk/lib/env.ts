export function getCdkAccount(): string | undefined {
  const value = process.env.CDK_DEFAULT_ACCOUNT;
  return value === undefined || value === '' ? undefined : value;
}

export function getCdkRegion(): string {
  const value = process.env.CDK_DEFAULT_REGION;
  return value === undefined || value === '' ? 'ap-south-1' : value;
}
