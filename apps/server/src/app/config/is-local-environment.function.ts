export function isLocalEnvironment(): boolean {
  return (
    process.env.USE_LOCAL_SERVICES === 'true' ||
    Boolean(process.env.AWS_ENDPOINT_URL)
  );
}
