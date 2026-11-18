#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/da2b2a73b58c2287fd34c7163560f802c6a78849f3c9978ee8457b3aeac49af4/contract';
import startContract from '../../snapshots/da2b2a73b58c2287fd34c7163560f802c6a78849f3c9978ee8457b3aeac49af4/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e0ea17c377c714eb43c8ae71b31fcf5c67147400e1debcc40cfc66aec3104772/contract';
import endContract from '../../snapshots/e0ea17c377c714eb43c8ae71b31fcf5c67147400e1debcc40cfc66aec3104772/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Trip',
        column: col('accessCodeEncrypted', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
