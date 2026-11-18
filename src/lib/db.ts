import 'server-only';
import { createHash } from 'node:crypto';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from '../../prisma/generated/contract.d';
import contractJson from '../../prisma/generated/contract.json' with { type: 'json' };
import { postgresState } from './db-errors';
const contract = contractFromJson<Contract>(contractJson);
const createDb = () => postgres({ contract, url: process.env.DATABASE_URL });
const globalDb = globalThis as unknown as {
  tripDbV8?: ReturnType<typeof createDb>;
  tripDbV8Key?: string;
};
// Hot reload preserves globalThis, including clients built from older contracts.
const clientKey = createHash('sha256')
  .update(JSON.stringify(contractJson))
  .update(process.env.DATABASE_URL ?? '')
  .digest('hex');
const cached = globalDb.tripDbV8;
const reusable = cached && globalDb.tripDbV8Key === clientKey;
export const db = reusable ? cached : createDb();
if (process.env.NODE_ENV !== 'production') {
  globalDb.tripDbV8 = db;
  globalDb.tripDbV8Key = clientKey;
  if (cached && !reusable) void cached.close().catch(() => {});
}
// Resolve native-enum/contract metadata outside BEGIN; otherwise v8 can query
// before SET TRANSACTION and PostgreSQL refuses the isolation change.
let metadataReady: Promise<unknown> | undefined;
function prepareMetadata() {
  return (metadataReady ??= Promise.resolve(db.orm.public.Planner.limit(0).all()).catch((error) => {
    metadataReady = undefined;
    throw error;
  }));
}
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      await prepareMetadata();
      return await db.transaction(async (tx) => {
        await tx.execute(
          tx.raw.sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`.affectedCount().build(),
        );
        await tx.execute(tx.raw.sql`SET LOCAL statement_timeout = '15s'`.affectedCount().build());
        await tx.execute(
          tx.raw.sql`SET LOCAL idle_in_transaction_session_timeout = '15s'`.affectedCount().build(),
        );
        return work(tx);
      });
    } catch (error) {
      if (!['40001', '40P01'].includes(postgresState(error) || '') || attempt >= 3) throw error;
    }
  }
}
