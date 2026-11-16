/** PostgreSQL SQLSTATE survives Prisma v8's structured driver/commit envelopes. */
export function postgresState(error: unknown): string | null {
 const seen = new Set<unknown>();
 while (error && typeof error === 'object' && !seen.has(error)) {
  seen.add(error);
  const value=error as {sqlState?:unknown;code?:unknown;cause?:unknown};
  if(typeof value.sqlState==='string')return value.sqlState;
  if(typeof value.code==='string'&&/^[0-9A-Z]{5}$/.test(value.code))return value.code;
  error=value.cause;
 }
 return null;
}
