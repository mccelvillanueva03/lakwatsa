import { afterAll, expect, test } from 'vitest';
import { db, transaction } from '../src/lib/db';
const enabled=!!process.env.TEST_DATABASE_URL;
afterAll(async()=>{await db.close();});
test.skipIf(!enabled)('v8 transactions run serializable and roll back failed writes',async()=>{
 const level=await transaction(async tx=>tx.query(tx.raw.sql`SELECT current_setting('transaction_isolation') AS level`.returnsRow({level:{codecId:'pg/text@1'}}).build()));
 expect(level[0].level).toBe('serializable');
 await expect(transaction(async tx=>{await tx.orm.public.Planner.create({email:'rollback@v8.test',salt:'salt',hash:'hash'});throw new Error('rollback');})).rejects.toThrow('rollback');
 expect(await db.orm.public.Planner.where({email:'rollback@v8.test'}).first()).toBeNull();
});
test.skipIf(!enabled)('all six same-trip foreign keys retain deferred checking',async()=>{
 const rows=await db.query(db.raw.sql`SELECT count(*)::integer AS count FROM pg_constraint WHERE conname LIKE '%same_trip' AND condeferrable AND condeferred`.returnsRow({count:{codecId:'pg/int4@1'}}).build());
 expect(rows[0].count).toBe(6);
});
