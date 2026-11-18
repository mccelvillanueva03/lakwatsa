# Trip Lang MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver the group trip planner described in the approved MVP design, including real persistence, secure access, voting, finalization, and exact payment tracking.

**Architecture:** One Next.js App Router application. Server components read through Prisma; server actions validate and authorize mutations. Small server-only feature modules own authentication, trips, access, voting, and uploads. No separate API, generic repositories, or browser-storage authentication.

**Tech Stack:** Existing Next.js 16.4.2, React 19.3, TypeScript, Tailwind CSS 4; Prisma and Neon Postgres; Vercel Blob; shadcn/ui; Node crypto; Vitest for focused tests and Playwright for browser acceptance.

**Spec:** `docs/superpowers/specs/2026-10-23-trip-lang-mvp-design.md`

## Global Constraints

- Read relevant bundled Next.js guides in `node_modules/next/dist/docs/` before product code; retain the generated AGENTS.md block.
- Keep existing framework versions. Confirm installed package APIs before using them.
- Required persistence: Neon Postgres through Prisma. Required image storage: Vercel Blob. Required UI system: shadcn/ui.
- All timestamps are stored in UTC. Every trip stores an IANA timezone used to enter and display its local dates and times.
- Monetary values use a fixed-precision decimal type and must never be negative. Contribution options must be positive.
- Store hashes of passwords, opaque session tokens, and normalized access codes; never plaintext secrets.
- Planner cookies: HttpOnly, SameSite=Lax, Path=/, explicit expiry, Secure in production. Apply equivalent protections to member and viewer cookies.
- PLANNING → PLANNED is one-way. Viewers never mutate; members only vote under a verified session in Planning mode.
- No social auth, password recovery, payments processing, transaction ledger, chat, notifications, or separate backend.
- Work on an isolated feature branch/worktree. Do not publish, push, merge, or provision paid infrastructure as part of implementation.
- External prerequisites: Neon development/test database URLs, Blob token, and a strong viewer-cookie signing secret. Document setup in `.env.example` without real credentials; never replace persistence with mock/localStorage data.

## Review Focus

1. Concurrent vote/finalize and claim/reset requests: serialized state checks must prevent post-finalization writes and duplicate identities (Tasks 3–4).
2. DST gaps and ambiguous local times: reject nonexistent times and require an explicit offset for ambiguous times; display windows in the trip timezone (Tasks 2 and 5).
3. Concurrent code regeneration and old member cookies: every member/viewer operation must require current trip access; stale access must fail (Tasks 3–4).
4. Fractional money, excessive precision, and overpayments: reject invalid input, preserve exact cumulative payments, and clamp remaining balance and displayed progress (Tasks 1 and 4).
5. Database failure during image replacement: keep the original referenced image and clean up the new upload; delete old blobs only after successful database commit (Task 6).

## Task 1: Persistence and test foundation

**Files:** `prisma/schema.prisma`, `prisma/migrations/**`, `prisma.config.ts` if required by installed Prisma, `lib/db.ts`, `lib/money.ts`, `tests/money.test.ts`, `tests/schema.integration.test.ts`, `vitest.config.ts`, `package.json`, `.env.example`, `.gitignore`.

**Interfaces:** `db` is the shared Prisma client. `parseMoney(input: string): Prisma.Decimal` validates at most two fractional digits within Decimal(12,2). `remaining(target, paid): Prisma.Decimal` never returns negative values. Trip reads include options, members, chosen IDs, mode, timezone, and contribution state.

- [x] Read bundled Next.js installation, server/client components, forms/server actions, cookies, caching, and authentication guides; record applicable API decisions.
- [x] Install Prisma with its supported Postgres adapter, shadcn prerequisites, Vitest, and Playwright; add generate/migrate/test scripts. Initialize actual shadcn components as needed by later tasks.
- [x] Write failing tests for exact 0.10 + 0.20 arithmetic, negative/excess-precision input, overpayment balances, unique normalized identifiers, duplicate trip options, and cross-trip vote relations.
- [x] Run `npm test -- tests/money.test.ts tests/schema.integration.test.ts`; confirm missing behavior fails before implementation.
- [x] Implement the design's nine models, enum, Decimal fields, cascades, uniqueness, indexes, and composite trip/option ownership constraints where clear. Add SQL CHECK constraints for money and date windows. Option removal must clear affected votes transactionally.
- [x] Generate Prisma client and migration; apply migration to a dedicated test database. Run the tests and `npm run lint`; require passing results.

## Task 2: Planner authentication and account settings

**Files:** `lib/auth.ts`, `lib/validation.ts`, `app/actions/auth.ts`, `app/(auth)/sign-in/page.tsx`, `app/(auth)/register/page.tsx`, `app/account/page.tsx`, `components/action-form.tsx`, `components/ui/*`, `tests/auth.test.ts`, `tests/auth.integration.test.ts`, `tests/dates.test.ts`, `lib/dates.ts`.

**Interfaces:** `requirePlanner()` returns the authenticated planner or redirects for pages; mutation guards reject missing/expired identity. `requireOwnedTrip(tripId)` returns only an owned trip. `hashToken(raw)` uses SHA-256. Form actions return typed field errors and a generic unexpected-error message. Date conversion explicitly validates IANA zone and DST behavior.

- [x] Write tests for salted scrypt verification, incorrect passwords, email/username normalization and routing, expired/revoked sessions, logout, password-change revocation, and ownership rejection. Add timezone tests for UTC conversion, DST gaps, and ambiguous times.
- [x] Run focused tests and observe expected failures.
- [x] Implement crypto with Node scrypt and timing-safe comparison; use random 32-byte session tokens and 30-day database sessions. Do not expose stored hashes in page props or logs.
- [x] Implement registration, login, logout, username update, and password change using shared guards. Password changes require the current password and replace all prior sessions atomically.
- [x] Build accessible shadcn forms with labels, pending states, field errors, and credential autocomplete. Use generic credential errors and bounded input sizes.
- [x] Run unit/integration tests, lint, and type checking; verify both email and username login.

## Task 3: Trip lifecycle and invitation access

**Files:** `lib/trips.ts`, `lib/access.ts`, `app/actions/trips.ts`, `app/actions/access.ts`, `app/invite/route.ts`, `app/dashboard/page.tsx`, `app/trips/new/page.tsx`, `app/trips/[id]/manage/page.tsx`, `app/trips/[id]/entry/page.tsx`, `components/trip-form.tsx`, `tests/trips.integration.test.ts`, `tests/access.integration.test.ts`.

**Interfaces:** `createTrip(plannerId, input)` creates complete validated trip data transactionally. `requireTripAccess(tripId)` verifies ownership or current signed viewer access. Member guards additionally verify the trip-specific opaque session. Code redemption issues a viewer cookie then redirects to a clean URL; code regeneration returns a raw new code once.

- [x] Write tests for creation in both modes; required option counts; disabled contributions; duplicate names; invalid windows/timezones; unauthorized edits; and prevention of reopening Planned trips.
- [x] Write tests for invalid/expired/tampered viewer cookies, code rotation, view-only access, successful claim, duplicate concurrent claims, trip-specific sessions, reset/reclaim, and stale member access after code rotation.
- [x] Run tests red, then implement creation, dashboard reads, owned edits, option/member additions and removals, contribution toggle, and session reset.
- [x] Generate 12-character random access codes from an unambiguous uppercase alphabet; normalize case/separators before hashing. Sign viewer payloads with HMAC-SHA256, an environment secret, trip ID, code version, and 7-day expiry. Never put access codes in client analytics or subsequent navigation.
- [x] Require current viewer access before claiming. Only offer unclaimed names in Planning mode; Planned redemption bypasses name selection. Handle duplicate claims through the database unique constraint.
- [x] Build dashboard, trip creation, management, and entry forms. Warn planners that code holders see names, votes, and exact payments. Show newly generated code/link once with copy controls.
- [x] Run all current tests and lint; verify toggle-off retains payments and clears chosen contribution while toggle-on requires valid options/target.

## Task 4: Voting, finalization, and payments

**Files:** `lib/voting.ts`, `app/actions/voting.ts`, `app/actions/payments.ts`, `tests/voting.test.ts`, `tests/voting.integration.test.ts`, `tests/payments.integration.test.ts`.

**Interfaces:** `getLeaders(options, votes)` returns unique winner or tied candidates, with no-vote categories requiring explicit selection. `castVote(tripId, category, optionId)` derives identity from cookies. `finalizeTrip(tripId, choices)` derives planner identity, recounts votes, and validates submitted tie/no-vote choices in its transaction.

- [x] Write failing tests for replacement votes, disabled contribution votes, invalid categories, cross-trip option IDs, session expiry, viewers attempting votes, unique winners, ties, and no votes.
- [x] Write integration tests for finalization rollback on one unresolved category, concurrent voting/finalization, Planned-mode rejection, exact payment updates, ownership rejection, and contribution-disabled payment rejection.
- [x] Implement category validation and transaction locking/serializable retries so mode checks, votes, option edits, and finalization cannot race. All trip-changing paths use the same concurrency discipline.
- [x] Implement finalization: automatically select unique winners; accept only tied candidates when votes tie; accept any owned option when no votes exist; set chosen IDs, mode, and finalized timestamp together.
- [x] Implement planner-only cumulative amountPaid replacement, allowing zero and overpayment; derive remaining balances and capped progress without storing redundant totals.
- [x] Run complete unit/integration suite; require green results before UI integration.

## Task 5: Complete responsive product screens

**Files:** `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/trips/[id]/page.tsx`, `components/trip-view.tsx`, `components/vote-controls.tsx`, `components/finalize-dialog.tsx`, `components/member-payments.tsx`, `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`, `tests/e2e/trip.spec.ts`, `playwright.config.ts`.

**Interfaces:** Server reads provide viewer-safe data; interactive controls call the authorized actions from Tasks 2–4. No password hashes, session hashes, access-code hashes, or signing secrets enter serialized client props.

- [x] Write browser tests for registration → Planning creation → code redemption in separate member context → claim → vote/change vote → tie resolution → finalization → payment update. Assert member controls become read-only.
- [x] Add a second browser test for direct Planned creation with contributions disabled, including no claim flow and no contribution UI. Add invalid-field and unauthorized direct-action checks.
- [x] Run tests and observe failures against the starter/incomplete UI.
- [x] Replace starter branding with a mobile-first Trip Lang interface using installed shadcn cards, forms, buttons, badges, dialogs, progress, and tables/stacked lists. Use native date/time inputs with explicit timezone context.
- [x] Display all member-visible options, counts, selected votes, names, exact payments, and overall progress. Provide read-only viewer and Planned variants; planner controls remain ownership-gated.
- [x] Connect forms to server action errors and revalidation, with pending states and accessible feedback. Include loading, empty, error, and not-found states.
- [x] Run browser acceptance at 390px and 1440px widths; inspect screenshots for overflow, focus visibility, readable payment lists, and dialog usability.

## Task 6: Destination images and release verification

**Files:** `lib/uploads.ts`, `app/actions/uploads.ts`, `components/destination-image.tsx`, `tests/uploads.test.ts`, `tests/uploads.integration.test.ts`, `README.md`, `.env.example`.

**Interfaces:** Upload action accepts only owned-trip destination images: JPEG, PNG, WebP, at most 4 MiB. It validates actual file signatures as well as MIME and size, stores with Vercel Blob, and persists only trusted Blob URLs. Removal/replacement deletes the old image after database success.

- [x] Write tests for unauthorized uploads, non-image content, oversized files, failed Blob upload, database failure after upload, and replacement/removal cleanup ordering. Run red.
- [x] Implement server-side uploads and rollback cleanup; configure a compatible server-action body limit. Render images with meaningful alt text and a safe placeholder when missing.
- [x] Document environment setup, local/test databases, migrations, Blob configuration, cookie signing secret generation, commands, and deployment steps. Explain code sharing and lost-member-cookie recovery.
- [x] Run `npm test`, integration tests against dedicated Postgres, both Playwright paths, `npm run lint`, TypeScript checking, and `npm run build`; inspect every result.
- [x] Review the full change against the spec, especially access revocation, concurrency, DST, exact arithmetic, and Blob cleanup. Fix significant findings with regression tests.
- [x] Report verified behavior and any external-service checks blocked by unavailable credentials. Do not claim complete acceptance until all required checks pass; leave deployment and merging for a separate authorized step.

## Execution result

Local implementation and checks completed. See [verification and rulings](../implementation/2026-10-26-trip-lang-mvp-results.md). Hosted Neon connectivity and real Blob upload checks remain environment prerequisites; these have not been certified without credentials. Test filenames were consolidated as recorded in the results.
