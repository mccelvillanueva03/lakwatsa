# Prisma v8 Upgrade Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for the accepted native execution workflow.

**Goal:** Replace Prisma 6 with the explicitly approved latest Prisma 8 release candidate while preserving all Trip Lang behavior and existing PostgreSQL data.

**Architecture:** Use the v8 PostgreSQL runtime and contract artifacts. Port queries directly rather than adding a v6 compatibility layer. Keep existing SQL history and custom constraints; verify adoption/bootstrap on disposable databases before documenting production handoff. Preserve serializable transactions through verified PostgreSQL transaction settings if the v8 API lacks an isolation option.

**Spec:** Existing MVP design plus the user's explicit v8 target, including acknowledgement of its release-candidate status.

## Global constraints

- Preserve Neon production and separate local/test Postgres usage. Do not access or migrate production credentials/databases.
- Retain salted password hashing, opaque sessions, ownership checks, exact decimal money, UTC Date objects, same-trip constraints, and atomic voting/finalization.
- Do not implement the separately unapproved recovery-code design in this dependency migration.
- Read relevant bundled Next.js guides before edits. Preserve the Next.js/React versions.
- Pin the independently versioned v8 CLI/runtime releases resolved from npm.

## Tasks

- [x] Verify baseline tests and inspect v8 package types/docs. Record exact dependency versions and API changes.
- [x] Add failing regression checks for v8 transaction isolation/error mapping and existing-data compatibility; retain the whole existing suite.
- [x] Emit a matching contract/client; port DB setup, authentication, trips, payments, and page reads to typed v8 queries. Use decimal.js directly for exact calculations.
- [x] Replace deprecated unique/serialization error checks and nested writes with v8 equivalents and explicit transactional writes.
- [x] Establish v8 migration baseline/bootstrap preserving CHECK/composite FK constraints; verify fresh and existing databases and idempotent reapplication.
- [x] Update tests, scripts, environment examples, and README to v8 commands. Remove obsolete v6 dependencies and overrides.
- [x] Run full unit/Postgres suite, browser checks, lint, typecheck, production build, and a final independent review. Fix significant findings with regressions.

## Review focus

- A concurrent reset/claim/vote/finalization cannot weaken prior isolation guarantees.
- Decimal and Date decoding retain exact money and timezone semantics.
- Migration adoption preserves data and custom PostgreSQL constraints; no implicit destructive reset.
- Duplicate and serialization errors remain correctly handled without v6 P-codes.
- Production build must not connect to a real database just to import the runtime/config.

## Verification results

- Exact versions: Prisma CLI 8.0.0-rc.29; PostgreSQL runtime 8.0.0-rc.22; TypeScript 5.9.3; decimal.js 10.6.0. Aligned the CLI/runtime contract toolchain with an rc.22 override after mixed registries failed inference.
- All 26 tests across 9 files passed against a fresh PostgreSQL 18 disposable database. The original suite also passed against adoption of the legacy SQL schema.
- Fresh bootstrap applied all 50 operations; repeated migration applied zero operations. Strict database verification and offline migration graph/artifact integrity checks passed.
- A separate original-schema fixture retained its planner ID, email, username, password-hash fields, session linkage/token-hash, and millisecond timestamps after adoption, migration and strict verification.
- Regression checks cover serializable isolation/rollback, nested PostgreSQL error extraction, and all six DEFERRABLE INITIALLY DEFERRED composite foreign keys. V8 inference omits the latter property, so baseline SQL restores it explicitly.
- All 6 mobile/desktop browser acceptance tests passed. V8 tracing generates random IDs before SQL; explicit Next.js request-time boundaries in authentication helpers remove prerender diagnostics. The rerun contained no unstable-value/route-error diagnostics.
- ESLint and TypeScript checks passed. The final production build passed after clearing `.next` to discard a persisted sandbox port-binding error.
- Independent final review found no correctness or data-preservation findings. No production database was accessed or deployed.
- Dependency audit: zero runtime advisories (`npm audit --omit=dev`). Full audit reports 32 advisories (24 moderate, 8 high) in development dependencies, including the unified Prisma CLI's Composer/dev dependency tree and lint tooling. Compatible `npm audit fix` did not clear them. No forced downgrade to Prisma 7 or breaking overrides were applied.
- Historical schema and SQL history retained; future changes use the v8 contract/artifacts/migration graph. README explains empty bootstrap, one-time existing-schema adoption, separate local/test/Neon targets, and release commands.
