# Trip Lang MVP Design

## Intent

Trip Lang is a mobile-friendly group trip planner for a planner and their friends. It should let a planner create a vacation or staycation, invite members with a shared code, settle the destination, schedule, and optional per-member contribution through voting, and track exact payments after the trip is settled.

The first release is for trusted friend groups. Its architecture should still be safe enough to publish later without first splitting the application into separate frontend and backend services.

## Goals

- Give planners real accounts secured by email and password.
- Let a planner optionally add a unique username after registration and later sign in with either email or username.
- Let a planner create a trip directly in `PLANNING` or `PLANNED` mode.
- Let members and view-only visitors enter a trip using a planner-generated access code without creating accounts.
- In Planning mode, let each claimed member cast one changeable vote for a destination, a complete date/time window, and, when enabled, a per-member contribution amount.
- Automatically identify a unique winner in each voting category and require the planner to resolve ties before finalization.
- In Planned mode, disable voting and present the settled trip as read-only to members while keeping details editable by the planner.
- Let the planner enable or disable contribution tracking and, when enabled, record each member's exact cumulative amount paid.
- Let the planner upload destination images to Vercel Blob.
- Use shadcn/ui components consistently for the application interface.

## Non-goals

- Member accounts, member passwords, or social login
- Email verification, password recovery, or transactional email
- Payment processing or payment receipts
- A payment transaction ledger or audit history
- Notifications, comments, chat, or collaborative editing
- Native mobile applications
- A separate public API or standalone backend service
- Automatic tie-breaking

## Anti-goals

- Do not expose planner mutations to members or view-only visitors.
- Do not store passwords, access codes, or session tokens in plaintext.
- Do not use browser `localStorage` or `sessionStorage` as the authentication source of truth.
- Do not add speculative abstractions or services for possible future mobile clients.
- Do not build custom replacements for suitable shadcn/ui primitives.

## Constraints

- Existing stack: Next.js 16.4.2 App Router, React 19.3, TypeScript, and Tailwind CSS 4.
- Required persistence: Neon Postgres through Prisma.
- Required image storage: Vercel Blob.
- Required UI system: shadcn/ui.
- Before product code is written, the implementer must read the relevant version-specific guides under `node_modules/next/dist/docs/`, as required by `AGENTS.md`.
- All timestamps are stored in UTC. Every trip stores an IANA timezone used to enter and display its local dates and times.
- Monetary values use a fixed-precision decimal type and must never be negative.

## Approaches Considered

### 1. Lean Next.js monolith — selected

Next.js owns pages, server-side mutations, authentication, and authorization. Prisma is the only application database layer, Neon is the database, and Vercel Blob holds uploaded images. Node's built-in cryptography supplies password hashing and random session tokens.

This is the smallest deployable architecture that meets the MVP's security and data requirements. It has one codebase, one deployment, no token-refresh protocol, and no separate API service to operate.

### 2. Authentication library plus Next.js

An authentication package could manage planner sessions and leave the trip features in Next.js. This reduces some custom session code but adds configuration and concepts while email verification, OAuth, and third-party identity providers are explicitly outside the MVP.

### 3. Separate frontend and backend

A standalone API could support future mobile clients, but it would duplicate validation and deployment concerns before another client exists. It was rejected as premature complexity.

## Architecture

The application is one Next.js App Router project. Server-rendered pages load data directly through Prisma. Server actions handle same-application mutations. Client components are reserved for interaction that needs immediate browser state, such as voting controls, toggles, dialogs, and uploads.

The code should have clear feature boundaries for authentication, trips, members, voting, and uploads, without creating one-implementation interfaces or generic repositories. Authorization and validation live in shared server-only functions so every mutation passes through the same checks.

shadcn/ui is the required component base. Forms, buttons, cards, dialogs, dropdowns, alerts, badges, progress indicators, tables, tabs, and toasts should use installed shadcn/ui components. Trip-specific components may compose those primitives but should not recreate them. Native HTML date/time inputs are sufficient for the MVP unless the installed shadcn components provide an equally simple accessible option.

## Data Model

### Planner

- `id`
- unique normalized `email`
- optional unique normalized `username`
- password salt and password hash
- created and updated timestamps

Email and password are required at registration. Username is nullable and can be configured later. A planner may sign in with email or an existing username.

Usernames are normalized to lowercase, cannot contain `@`, and are unique. A login identifier containing `@` is treated as an email; any other identifier is treated as a username. This prevents one identifier from matching two different planner accounts.

### PlannerSession

- `id`
- `plannerId`
- unique session-token hash
- expiration timestamp
- creation timestamp

### Trip

- `id`
- `plannerId`
- title and optional description
- unique access-code hash
- access-code version used to revoke signed viewer cookies
- mode: `PLANNING` or `PLANNED`
- IANA timezone
- `contributionsEnabled`
- optional chosen destination, date option, and contribution option
- optional finalized timestamp
- created and updated timestamps

### Member

- `id`
- `tripId`
- name, unique within the trip
- exact cumulative `amountPaid`, defaulting to zero
- optional current destination, date, and contribution vote IDs
- created and updated timestamps

Each vote relation must point to an option owned by the same trip. This is enforced in mutation validation and, where Prisma/Postgres permits a clear schema, by composite foreign keys.

### MemberSession

- `id`
- unique `memberId`, allowing one active claimed browser per member
- unique session-token hash
- expiration and creation timestamps

### DestinationOption

- `id`
- `tripId`
- destination name
- optional Vercel Blob image URL
- created and updated timestamps

Destination names are unique within a trip.

### DateOption

- `id`
- `tripId`
- UTC start timestamp
- UTC end timestamp
- created and updated timestamps

The end must be later than the start. Duplicate start/end windows are not allowed within one trip.

### ContributionOption

- `id`
- `tripId`
- fixed-precision amount per member
- created and updated timestamps

Amounts must be positive and unique within a trip.

## Authentication and Authorization

### Passwords

Registration normalizes and validates the email, generates a random salt, and hashes the password using Node's built-in `scrypt`. Login derives a hash using the saved salt and uses a timing-safe comparison. Plaintext passwords are never stored or logged.

### Planner sessions

Successful login generates a cryptographically random opaque token. Its SHA-256 hash, planner relationship, and expiration are stored in Neon. The raw token is sent only in a cookie named `planner_session` with `HttpOnly`, `SameSite=Lax`, `Path=/`, an explicit expiration, and `Secure` in production.

Protected server pages and mutations hash the cookie token, look up the database session, verify expiration, load the planner, and verify trip ownership. Logout deletes the database session and clears the cookie. A password change deletes all planner sessions and creates a new session for the current browser.

The MVP uses no JWT access token, refresh token, or refresh-token rotation. Database sessions provide immediate revocation with less protocol and are appropriate for a same-origin Next.js application.

### Member sessions

In Planning mode, a visitor may claim an unclaimed planner-created member name. The server creates an opaque member-session token and stores only its hash. The raw token is placed in a trip-specific `HttpOnly` cookie so one browser can participate in multiple trips.

A unique member-session relationship means a member name can be claimed by only one browser at a time. The planner can reset a claim by deleting that member session. A member who cleared their cookie or changed devices can use view-only mode until the planner resets the claim.

Voting mutations derive member identity from the verified session; they never trust a submitted member ID. In Planned mode no member session is required because all member access is read-only.

### Trip access codes

The planner receives a short random access code with sufficient entropy for a private group. Neon stores only its hash. The normalized code is hashed for lookup. The planner can regenerate it, immediately invalidating the previous code.

The planner shares an invite link containing the code. Opening it validates the code, sets a short-lived signed `HttpOnly` trip-access cookie containing the trip ID and current access-code version, then redirects to a clean URL so the code is not retained in subsequent links or requests. Manual code entry follows the same redirect flow. Regenerating the access code increments its version, invalidating previously issued trip-access cookies. This stateless viewer cookie is not an identity or voting session.

Anyone with the code may see all trip data intended for members, including names, votes, and exact contribution amounts. The interface must make this sharing model clear to the planner.

## Trip Creation and Editing

The planner chooses the mode during creation.

### Create in Planning mode

The planner supplies trip details, timezone, member names, at least two destination options, and at least two date windows. If contributions are enabled, the planner also supplies at least two positive per-member contribution options.

The trip opens for member claiming and voting immediately after creation. The planner may edit trip details and options while it remains in Planning mode. Destructive option changes must not silently leave invalid votes; deleting an option sets votes for that option to null.

### Create in Planned mode

The planner supplies settled trip details, member names, one destination, and one date window. If contributions are enabled, the planner supplies one per-member contribution target. These values are stored as the trip's chosen options immediately, and no voting flow is created.

Planned trip details remain editable by the planner for corrections. Members and view-only visitors always receive a read-only view.

### Contribution toggle

When disabled, contribution choices, targets, progress, and payment controls are hidden. Disabling contributions clears the trip's chosen contribution option but retains existing member `amountPaid` values so accidental toggling does not lose data. Re-enabling contributions requires a contribution choice during Planning mode or a settled target during Planned mode.

Only the planner may update `amountPaid`. The interface calculates each member's remaining balance as `max(target - amountPaid, 0)` and overall progress from member targets and payments; redundant totals are not stored.

## Member Entry and Visibility

A visitor enters the shared trip code. Invalid codes return a generic error and do not reveal whether a similar trip exists.

For a Planning trip, the visitor sees two paths:

1. Select an available member name and obtain a member session to vote.
2. Select **View trip only** without claiming a member or receiving a session.

View-only visitors can see all destinations, date windows, contribution options, live vote totals, member names and selected votes, exact per-member payment data, and overall contribution progress. They cannot create or modify votes.

For a Planned trip, code entry goes directly to the complete read-only trip view. No member-name selection is displayed.

## Voting and Finalization

Each claimed member has at most one current selection in each enabled category:

- one destination
- one complete date/time window
- one per-member contribution amount when contributions are enabled

Members may change their selections while the trip is in Planning mode. Vote mutations must verify the member session, trip mode, category, and option ownership in one server-side operation.

When the planner requests finalization, the server counts current votes for each category. A category with one highest option selects that option automatically. A tie must be presented to the planner, who explicitly chooses one of the tied options. A category with no votes also requires an explicit planner choice. Finalization cannot complete until all required categories have a selection.

The final mode change and chosen-option updates run in one database transaction. Once the trip becomes Planned, every voting mutation rejects changes on the server even if a stale client still shows a voting control.

The transition from Planning to Planned is one-way in the MVP. Editing a Planned trip may correct its settled details but cannot reopen voting or restore it to Planning mode.

## Screens

### Public and authentication

- Landing page with planner sign-in/register actions and trip-code entry
- Planner registration
- Planner sign-in using email or username

### Planner

- Dashboard listing trips, modes, dates, and contribution progress
- Create-trip flow with mode and contribution toggles
- Manage-trip page for details, options, members, images, access code, member-session reset, and payments
- Finalization dialog showing counts, unique winners, and required tie/no-vote selections
- Optional account page for setting or changing username and password

### Member and view-only

- Trip-code entry
- Planning entry page with available member names and **View trip only**
- Planning trip page with voting controls for claimed members and a read-only variant for viewers
- Planned trip page with settled destination, date window, and optional contribution status

The layout should be designed mobile-first. shadcn/ui cards and responsive tables or stacked lists should keep payment and voting information readable on narrow screens. All controls need visible labels, keyboard access, focus states, and accessible error messages.

## Data Flow and Validation

- Server components fetch trip data needed for initial rendering.
- Server actions parse untrusted inputs, authenticate or validate code/session access, authorize the operation, validate trip relationships and state, then mutate through Prisma.
- Successful mutations revalidate or redirect the relevant route.
- Vercel Blob uploads accept only configured image MIME types and size limits. A replaced or removed image should be deleted from Blob only after the database mutation succeeds.
- User-facing forms return field-level errors for expected validation failures.
- Unexpected errors are logged server-side with no secrets, hashes, or raw tokens and return a generic message.

Expected failures include invalid credentials, invalid or expired sessions, invalid access codes, already-claimed members, duplicate names/options, invalid date windows, negative amounts, cross-trip option IDs, unauthorized planner access, unresolved ties, and attempts to vote in Planned mode.

## Testing and Acceptance

Focused unit or integration checks must cover:

- password hashing and verification
- opaque session creation, expiration, logout, and revocation
- planner ownership enforcement
- creation in both Planning and Planned modes
- contribution-enabled and contribution-disabled behavior
- member claiming, duplicate-claim rejection, planner reset, and view-only access
- one current vote per category and vote replacement
- cross-trip option rejection
- unique-winner calculation, ties, and no-vote categories
- atomic finalization and Planned-mode vote rejection
- exact payment and remaining-balance calculations

One browser-level happy path should cover planner registration, Planning-trip creation, member claim, voting, tie or winner handling, finalization, and planner payment updates. A second concise path should verify direct creation in Planned mode with contributions disabled.

The implementation is complete when these checks pass, lint and production build succeed, and the key flows are verified in a browser at mobile and desktop widths.

## Builder Decisions Still Available

The implementer may choose route and file names, individual shadcn/ui component variants, session durations, access-code display format, image type/size limits, and test tooling. These choices must follow existing project conventions, current bundled Next.js documentation, and the minimal architecture above without changing user-visible behavior.
