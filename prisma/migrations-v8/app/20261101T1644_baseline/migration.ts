#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/da2b2a73b58c2287fd34c7163560f802c6a78849f3c9978ee8457b3aeac49af4/contract';
import endContract from '../../snapshots/da2b2a73b58c2287fd34c7163560f802c6a78849f3c9978ee8457b3aeac49af4/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  rawSql,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'TripMode',
        members: ['PLANNING', 'PLANNED'],
      }),
      this.createTable({
        schema: 'public',
        table: 'ContributionOption',
        columns: [
          col('amount', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tripId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'ContributionOption_pkey' }),
          checkExpression('ContributionOption_amount_positive', sql`(amount > (0)::numeric)`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'DateOption',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('end', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('start', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('tripId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'DateOption_pkey' }),
          checkExpression('DateOption_valid_window', sql`("end" > start)`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'DestinationOption',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tripId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'DestinationOption_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Member',
        columns: [
          col('amountPaid', 'numeric(12,2)', {
            notNull: true,
            default: lit('0.00'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('contributionVoteId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('dateVoteId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('destinationVoteId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tripId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'Member_pkey' }),
          checkExpression('Member_amountPaid_nonnegative', sql`("amountPaid" >= (0)::numeric)`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'MemberSession',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('memberId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'MemberSession_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Planner',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('hash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('salt', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('username', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'Planner_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'PlannerSession',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('plannerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'PlannerSession_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'Trip',
        columns: [
          col('accessCodeHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('accessCodeVersion', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('chosenContributionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('chosenDateId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('chosenDestinationId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contributionsEnabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('finalizedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mode', '"TripMode"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'TripMode' } },
          }),
          col('plannerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('timezone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'Trip_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ContributionOption',
        index: 'ContributionOption_tripId_amount_key',
        columns: ['tripId', 'amount'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'ContributionOption',
        index: 'ContributionOption_tripId_id_key',
        columns: ['tripId', 'id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'DateOption',
        index: 'DateOption_tripId_id_key',
        columns: ['tripId', 'id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'DateOption',
        index: 'DateOption_tripId_start_end_key',
        columns: ['tripId', 'start', 'end'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'DestinationOption',
        index: 'DestinationOption_tripId_id_key',
        columns: ['tripId', 'id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'DestinationOption',
        index: 'DestinationOption_tripId_name_key',
        columns: ['tripId', 'name'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Member',
        index: 'Member_tripId_name_key',
        columns: ['tripId', 'name'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'MemberSession',
        index: 'MemberSession_memberId_key',
        columns: ['memberId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'MemberSession',
        index: 'MemberSession_tokenHash_key',
        columns: ['tokenHash'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Planner',
        index: 'Planner_email_key',
        columns: ['email'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Planner',
        index: 'Planner_username_key',
        columns: ['username'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'PlannerSession',
        index: 'PlannerSession_plannerId_idx',
        columns: ['plannerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PlannerSession',
        index: 'PlannerSession_tokenHash_key',
        columns: ['tokenHash'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_accessCodeHash_key',
        columns: ['accessCodeHash'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Trip',
        index: 'Trip_plannerId_idx',
        columns: ['plannerId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ContributionOption',
        foreignKey: {
          name: 'ContributionOption_tripId_fkey',
          columns: ['tripId'],
          references: { schema: 'public', table: 'Trip', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DateOption',
        foreignKey: {
          name: 'DateOption_tripId_fkey',
          columns: ['tripId'],
          references: { schema: 'public', table: 'Trip', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DestinationOption',
        foreignKey: {
          name: 'DestinationOption_tripId_fkey',
          columns: ['tripId'],
          references: { schema: 'public', table: 'Trip', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Member',
        foreignKey: {
          name: 'Member_contributionVoteId_fkey',
          columns: ['contributionVoteId'],
          references: { schema: 'public', table: 'ContributionOption', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Member',
        foreignKey: {
          name: 'Member_contribution_same_trip',
          columns: ['tripId', 'contributionVoteId'],
          references: { schema: 'public', table: 'ContributionOption', columns: ['tripId', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Member',
        foreignKey: {
          name: 'Member_dateVoteId_fkey',
          columns: ['dateVoteId'],
          references: { schema: 'public', table: 'DateOption', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Member',
        foreignKey: {
          name: 'Member_date_same_trip',
          columns: ['tripId', 'dateVoteId'],
          references: { schema: 'public', table: 'DateOption', columns: ['tripId', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Member',
        foreignKey: {
          name: 'Member_destinationVoteId_fkey',
          columns: ['destinationVoteId'],
          references: { schema: 'public', table: 'DestinationOption', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Member',
        foreignKey: {
          name: 'Member_destination_same_trip',
          columns: ['tripId', 'destinationVoteId'],
          references: { schema: 'public', table: 'DestinationOption', columns: ['tripId', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Member',
        foreignKey: {
          name: 'Member_tripId_fkey',
          columns: ['tripId'],
          references: { schema: 'public', table: 'Trip', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MemberSession',
        foreignKey: {
          name: 'MemberSession_memberId_fkey',
          columns: ['memberId'],
          references: { schema: 'public', table: 'Member', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PlannerSession',
        foreignKey: {
          name: 'PlannerSession_plannerId_fkey',
          columns: ['plannerId'],
          references: { schema: 'public', table: 'Planner', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_chosenContributionId_fkey',
          columns: ['chosenContributionId'],
          references: { schema: 'public', table: 'ContributionOption', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_chosenDateId_fkey',
          columns: ['chosenDateId'],
          references: { schema: 'public', table: 'DateOption', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_chosenDestinationId_fkey',
          columns: ['chosenDestinationId'],
          references: { schema: 'public', table: 'DestinationOption', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_contribution_same_trip',
          columns: ['id', 'chosenContributionId'],
          references: { schema: 'public', table: 'ContributionOption', columns: ['tripId', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_date_same_trip',
          columns: ['id', 'chosenDateId'],
          references: { schema: 'public', table: 'DateOption', columns: ['tripId', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_destination_same_trip',
          columns: ['id', 'chosenDestinationId'],
          references: { schema: 'public', table: 'DestinationOption', columns: ['tripId', 'id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Trip',
        foreignKey: {
          name: 'Trip_plannerId_fkey',
          columns: ['plannerId'],
          references: { schema: 'public', table: 'Planner', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      // Prisma v8 does not represent FK deferrability in its contract yet.
      rawSql({
        id: 'defer.Member_destination_same_trip',
        label: 'Preserve deferred constraint Member_destination_same_trip',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'Restore original deferred foreign-key behavior',
            sql: 'ALTER TABLE "public"."Member" ALTER CONSTRAINT "Member_destination_same_trip" DEFERRABLE INITIALLY DEFERRED',
            params: [],
          },
        ],
        postcheck: [],
      }),
      rawSql({
        id: 'defer.Member_date_same_trip',
        label: 'Preserve deferred constraint Member_date_same_trip',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'Restore original deferred foreign-key behavior',
            sql: 'ALTER TABLE "public"."Member" ALTER CONSTRAINT "Member_date_same_trip" DEFERRABLE INITIALLY DEFERRED',
            params: [],
          },
        ],
        postcheck: [],
      }),
      rawSql({
        id: 'defer.Member_contribution_same_trip',
        label: 'Preserve deferred constraint Member_contribution_same_trip',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'Restore original deferred foreign-key behavior',
            sql: 'ALTER TABLE "public"."Member" ALTER CONSTRAINT "Member_contribution_same_trip" DEFERRABLE INITIALLY DEFERRED',
            params: [],
          },
        ],
        postcheck: [],
      }),
      rawSql({
        id: 'defer.Trip_destination_same_trip',
        label: 'Preserve deferred constraint Trip_destination_same_trip',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'Restore original deferred foreign-key behavior',
            sql: 'ALTER TABLE "public"."Trip" ALTER CONSTRAINT "Trip_destination_same_trip" DEFERRABLE INITIALLY DEFERRED',
            params: [],
          },
        ],
        postcheck: [],
      }),
      rawSql({
        id: 'defer.Trip_date_same_trip',
        label: 'Preserve deferred constraint Trip_date_same_trip',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'Restore original deferred foreign-key behavior',
            sql: 'ALTER TABLE "public"."Trip" ALTER CONSTRAINT "Trip_date_same_trip" DEFERRABLE INITIALLY DEFERRED',
            params: [],
          },
        ],
        postcheck: [],
      }),
      rawSql({
        id: 'defer.Trip_contribution_same_trip',
        label: 'Preserve deferred constraint Trip_contribution_same_trip',
        operationClass: 'additive',
        target: { id: 'postgres' },
        precheck: [],
        execute: [
          {
            description: 'Restore original deferred foreign-key behavior',
            sql: 'ALTER TABLE "public"."Trip" ALTER CONSTRAINT "Trip_contribution_same_trip" DEFERRABLE INITIALLY DEFERRED',
            params: [],
          },
        ],
        postcheck: [],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
