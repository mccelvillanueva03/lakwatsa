# Trip Lang

A mobile-friendly group trip planner built with Next.js 16.4.2, React 19.3, Prisma/Postgres, shadcn/ui, and Vercel Blob.

A planner creates a **Planning** trip with changeable member votes, or a **Planned** trip with settled details. Friends use a private code without creating accounts. Planners resolve ties, finalize the plan, and record exact cumulative payments.

## Run locally

Requires Node.js 22.18+ (22.x), 24.11+ (24.x), or 26+ and a Postgres database (Neon for deployment).

```sh
npm ci
cp .env.example .env.local
```

Configure `.env.local`:

- `DATABASE_URL`: your local development Postgres connection string. Use a separate Neon connection string with `sslmode=require` only for production.
- `ACCESS_COOKIE_SECRET`: at least 32 random characters. Generate with `openssl rand -hex 32`.
- `BLOB_READ_WRITE_TOKEN`: token for a **public** Vercel Blob store. Images are public to anyone with their unpredictable URL; avoid sensitive photos. Uploads require this token; other trip features do not.
- `TEST_DATABASE_URL`: a separate disposable Postgres database for integration tests. Never point this at production.

Prisma CLI does not load `.env.local` automatically. Export `DATABASE_URL` in your shell when running its commands (or use a git-ignored `.env` for Prisma). Next.js loads `.env.local` when running the app.

```sh
npm run db:generate
npm run db:migrate # empty database only; see adoption below for existing databases
npm run dev
```

Open [localhost:3000](http://localhost:3000). Register with email and a password of at least 12 characters. An optional username can be set on Account. Password recovery and email verification are intentionally outside this MVP.

## Prisma v8 and your three databases

This project uses Prisma CLI **8.0.0-rc.29** and PostgreSQL runtime **8.0.0-rc.22**. These are release candidates. The native contract is `prisma/contract.prisma`; emitted types live in `prisma/generated/`. The legacy schema and SQL migrations are retained as history, not as inputs to v8 commands.

Keep three separate databases: Neon production, local development for trying changes, and a disposable local test database. DBeaver can connect to each for inspection; migrations in Git remain the source of schema changes. Give connections clear names and verify the selected database before executing SQL.

For an **empty** local or test database, set `DATABASE_URL` to that database, then run `npm run db:migrate`. The committed v8 baseline creates the schema, including checks and deferred same-trip foreign keys.

For an **existing database with the original MVP schema and data**, back it up first, then run these commands with `DATABASE_URL` pointing at that database:

```sh
npm run db:adopt   # verify and sign the existing schema; do not replay table creation
npm run db:verify
npm run db:migrate
```

Adoption records v8 metadata without resetting application tables. It requires the original schema to match the committed contract. If verification fails, investigate the difference before continuing. Do this once per existing database; production adoption is a separate release operation you perform against Neon after validating a backup and the same procedure locally. Neither `db:adopt` nor release `db:migrate` advances the repository's development ref.

For future schema changes:

1. Edit `prisma/contract.prisma` and run `npm run db:generate`.
2. Run `npm run db:plan -- --name describe_change`, inspect the generated migration, then run `npm run db:dev` against local development.
3. Commit the contract, emitted artifacts, and `prisma/migrations-v8/` changes together. The local development command advances the tracked `db` ref for the next migration plan.
4. Apply `npm run db:migrate` to the disposable test database and run all checks. Apply the same committed migrations to Neon as a separate release step before deploying the app.

Prisma v8 currently omits foreign-key deferrability from contract inference. Preserve the six deferred composite foreign keys in future migration changes; the baseline adds explicit SQL operations and integration tests check their settings. `db:verify` alone does not check that omitted property.

## Checks

```sh
npm test                 # unit tests; database cases explicitly skip without TEST_DATABASE_URL
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
```

For all integration checks, export a **dedicated test** database URL and a test-only signing secret, migrate that database, then run:

```sh
# DATABASE_URL and TEST_DATABASE_URL must both name the disposable test database.
npm run db:migrate
npm test
npm run test:e2e
```

Vitest uses `TEST_DATABASE_URL` instead of `DATABASE_URL` when supplied. Playwright's local server uses `DATABASE_URL`. Integration tests clean only their reserved fixture email domains; browser tests create uniquely named fixtures and retain them for inspection. Destroy or reset the disposable database when finished. Do not run against a database containing real users.

Browser acceptance runs at iPhone-sized and desktop Chromium widths. It covers registration, Planning creation, separate member entry and claiming, voting, finalization with explicit unvoted-category decisions, exact payment updates, and direct Planned creation without contributions. Additional checks cover invalid invitations, protected-page access, server-error field retention, and automatic vote refresh. Failure traces and screenshots live under ignored `test-results/`.

Blob tests replace only the external Blob transport, keeping real database writes, authorization, file validation, and cleanup ordering. A real upload with your Blob token is still needed to verify that store's configuration.

## Access and data rules

- Passwords use salted scrypt. Database planner/member sessions contain only SHA-256 token hashes; browser cookies are HttpOnly, SameSite=Lax, and Secure in production.
- Planner and member sessions last 30 days. Viewer access is HMAC-signed, trip-specific, versioned, and lasts 7 days. Signing-secret rotation revokes all viewer access.
- An invite immediately redirects to a clean path. Access codes have 60 bits of randomness; only hashes are saved. Save the code/link when it appears. Generating another revokes the previous code and existing visitor access, including voting until the new code is entered.
- Anyone holding a code can see member names, selections, vote totals, and exact payments. Only the planner can edit the plan or payments. Only claimed members can vote while Planning.
- A name has one active claimed browser. If someone clears cookies or changes devices, the planner can reset that claim. Codes alone cannot take over a claim.
- Finalization is one-way. Unique winners are automatic; ties and no-vote categories require a planner choice. Mutations lock the trip in serializable transactions and retry serialization conflicts. Open, visible trip pages refresh every 10 seconds to update votes and payments.
- Postgres enforces same-trip option references, unique options/member names, positive contribution targets, nonnegative payments, and valid date windows. Options removed while Planning clear affected votes.
- Payments are cumulative amounts, not transactions. Disabling contributions retains payments and clears the chosen target. Remaining balances and progress are derived; overpayments are allowed.
- Dates are entered/displayed in each trip's IANA timezone and stored as UTC instants. Nonexistent daylight-saving times are rejected; ambiguous times require an explicit UTC offset. Changing the trip timezone preserves saved instants.
- Images accept JPEG/PNG/WebP, signature-checked, at most 4 MiB. Replacements/removals delete the previous Blob only after DB success; failed DB writes attempt to clean the new upload. Failed cleanup is logged without URLs/tokens and may require manual orphan cleanup.

## Deploy

1. Create a Neon database and a public Vercel Blob store; configure the three runtime environment variables above in your deployment project.
2. Run `npm ci`, `npm run db:generate`, and `npm run db:migrate` against the intended database as a release step. Do not run migrations against a test database by accident.
3. Run `npm run build`, deploy to a Node.js-capable Next.js host, and use HTTPS for production cookies. For a self-hosted server, run `npm start` after building.
4. Verify registration/login, code entry, a real image upload/replacement/removal, and both trip modes on the deployed origin.

No infrastructure is provisioned and no application is published by this repository's scripts. Tests were designed for trusted friend groups; add public-service abuse controls and operational monitoring when opening registration beyond that audience.

Design: [MVP spec](docs/superpowers/specs/2026-10-23-trip-lang-mvp-design.md). Execution: [implementation plan](docs/superpowers/plans/2026-10-26-trip-lang-mvp.md).

Dependency note: the CLI and runtime use independently versioned v8 releases. The `@prisma/orm-toolchain` override aligns their contract-authoring registries at rc.22; without it these releases fail contract inference. Revalidate this override when upgrading either release. The scoped Zod override remains for the Blob dependency tree. `npm run build` emits contract artifacts before compiling; it does not apply migrations.

The current lockfile has no runtime dependency advisories (`npm audit --omit=dev`), but the full audit reports 32 development-tool advisories (24 moderate, 8 high), including Prisma CLI bundled tooling. Compatible audit fixes did not clear these; do not use `npm audit fix --force` to silently downgrade the approved v8 target.

### Reusable trip invitations

New trips and regenerated invitations save an AES-256-GCM encrypted copy of the current code. Only the owning planner can retrieve it, from the manage page or dashboard sharing button. The existing hash remains the lookup for invitation redemption. Keep `ACCESS_COOKIE_SECRET` stable: it also derives the encryption key for saved codes.

Apply the `save_trip_codes` migration before deploying this change. It adds one nullable column and preserves existing trips. Older codes cannot be recovered from hashes; those trips show a one-time regeneration option. Regeneration continues to revoke the previous code and existing visitor access.
