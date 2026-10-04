# DeliverHub Web (NodeWave Deliverable Platform Frontend)

Next.js 16.3.7 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI,
TanStack Query, Axios, and Zustand. Existing application styling is preserved.

## Getting started

```bash
bun install
cp .env.example .env.local
bun run dev
```

Set `NEXT_PUBLIC_BE_URL` to the backend origin (default `http://localhost:4000`).
Next.js embeds this public value at build time. Never place passwords, JWTs, or
other secrets in public environment variables or committed environment files.
The frontend uses system fonts; production builds do not download Google fonts.
Dependencies must already be installed for an offline build.

## Authentication and data boundaries

- Sign in with email and password. Passwordless quick-login, role switching, and
  seeded-user discovery have been removed; their backend endpoints are disabled.
- Public registration always requests `MEMBER`, with `UIUX`, `FRONTEND`, or
  `BACKEND` as the department. PM/client accounts are provisioned outside public
  registration. The backend independently validates this policy.
- Sign out posts to `/api/auth/logout` with the current Bearer token, then clears
  local identity, query caches, and conflict state even when revocation fails.
  HTTP 204 with an empty body confirms revocation; a login-page warning is shown
  only when revocation fails or is not confirmed.
- Private queries are keyed by identity and internal/client scope. Requests use
  a verified tab-local token registry, not whichever token is in shared storage.
  Each request captures its session synchronously; stale responses/401s cannot
  clear a newer identity. Storage events immediately clear private state and
  revalidate `/auth/me` before private requests resume. A storage mismatch before
  its event also fails closed. Cached profile fields are never trusted as auth.
- Session and project changes remount workspace state, resetting drawers, drafts,
  and modals. Mutation hooks retain the session that opened them: even a queued
  or retained callback cannot send an old session's draft under a new identity.
- Client projects/tasks/metrics use separate DTOs and a read-only client drawer.
  Explicit client response schemas discard unexpected fields before caching.
  This is defense in depth: the backend must whitelist response fields before
  they leave the server and enforce tenant/project access.

## Task contract

Internal tasks include `version` and backend-calculated `permissions`:
`canEdit`, `canStart`, `canComplete`, `canChangeStatus`,
`canManageDependencies`, `canAttach`, and `canDelete`. Missing permissions fail
closed. Starting/completing also requires the authenticated MEMBER assignee and
an unblocked task. PM can never complete a task, including an assigned task.
UI checks are convenience only; backend authorization is authoritative.

PM creation can select a MEMBER from the project's members. Unassigned tasks
cannot be started/completed. Client task DTOs contain no version, identities,
department, audit trail, dependents, or permissions; their prerequisite arrays
contain only client-visible tasks. Hidden prerequisite blocking reasons must be
generic. Client project counts refer to visible tasks, and client metrics omit
the department breakdown.

All writes to existing tasks include an expected `version`:

- Status PATCH and detail PUT: JSON body.
- Dependency POST: `{ prerequisiteTaskId, version }`.
- Dependency DELETE and task DELETE: JSON `{ version }` via Axios `data`.
- Attachment POST: `{ version, fileName, fileUrl, fileType?, fileSize? }`;
  returns an internal `TaskAttachment`, not a task. The link form uses
  `fileType: "link"` and HTTPS URLs. The backend requires a public hostname and
  rejects credentials, control characters, IP addresses, and local hosts;
  frontend HTTPS format checks do not replace backend URL validation.

Internal tasks also expose an **Internal Discussion** tab: comments are fetched from
`/api/comments?taskId=` (never part of the task DTO), posted through a React Hook
Form + Zod composer, and soft-deletable by the author or a PM. Clients receive no
comment endpoint access and the client DTO whitelist drops any comment fields.

Task creation has no existing version. The frontend does not expose attachment
deletion. All supported task writes share immediate query invalidation and 409
handling. Conflict responses are expected to contain
`{ success: false, error: "Conflict", message, latestData, serverVersion, clientVersion }`,
where `latestData` is a safe internal task. The dialog is dismissible without
stopping refresh; writes are never retried automatically. Description drafts
retain their original version across refetches. After a conflict, explicitly
discard/reopen the draft to start editing the latest server version.

## Complete list loading

Boards, internal/client project lists, client deliverables, and dependency
candidates request successive pages with `rows: 100`, following validated
`meta.totalPages`. The table still requests only its selected filtered page.
Opening a drawer/create form from the table loads complete, unfiltered project
candidates rather than using that table page as the dependency list.

Collection loading is abortable and limited to 1,000 pages (largest requested
offset: 99,900, within the backend's 100,000 offset bound). Larger lists fail
explicitly rather than silently returning partial data. Missing/unsafe metadata,
page-size mismatches, incomplete pages, changing totals, duplicate IDs, and
later-page errors also reject the collection. Client whitelists apply on every
page before caching. These checks detect pagination inconsistencies; they do not
provide a transactional snapshot while backend data is changing.

## Validation

| Command | Purpose |
| --- | --- |
| `bun test` / `bun run test` | Bun regression tests (no additional test dependencies) |
| `bun run typecheck` | TypeScript without emitting or updating incremental state |
| `bunx tsc --noEmit` | Literal compiler check used for review validation |
| `bun run lint` | Read-only Biome check of source and tests |
| `bun run lint:eslint` | Next.js/React ESLint rules |
| `bun run build` | Production build |
| `bun run start` | Serve an existing production build |

Tests render real React task controls, client views, and the conflict dialog
using React SSR, and exercise Axios requests, cache invalidation, draft versions,
authentication/session cleanup, cross-tab storage events, retained mutation hooks,
and complete/bounded list loading with in-memory adapters. They do not replace
browser interaction tests or backend security/atomicity/tenant-isolation tests.

## Evaluation accounts

If the evaluation backend has been seeded, use normal login with an account
provided by the evaluator, such as `pm@nodewave.id`, `uiux@nodewave.id`,
`fe@nodewave.id`, `be@nodewave.id`, or `client@acmecorp.com`. Obtain the password
through the evaluation setup; the frontend neither embeds nor auto-submits it.
Do not deploy shared evaluation accounts or credentials to production.
