import { expect, test } from 'vitest';
import { postgresState } from '../lib/db-errors';
test('finds PostgreSQL errors through v8 transaction envelopes',()=>{
 expect(postgresState({code:'RUNTIME.TRANSACTION_COMMIT_FAILED',cause:{sqlState:'40001'}})).toBe('40001');
 expect(postgresState({cause:{code:'23505'}})).toBe('23505');
 expect(postgresState({sqlState:'40P01'})).toBe('40P01');
 expect(postgresState(new Error('unrelated'))).toBeNull();
 const cyclic:{cause?:unknown}={};cyclic.cause=cyclic;expect(postgresState(cyclic)).toBeNull();
});
