# DeliverHub Web (NodeWave Deliverable Platform Frontend)

Frontend for the NodeWave Deliverable Platform — a state-aware task engine for managing
deliverables of high-value projects. Built with **Next.js 16 (App Router) + React 19 +
TypeScript + Tailwind CSS 4 + Radix UI + TanStack Query + Zustand**.

## Features

- **Dependency-Aware Kanban Board** — cards are auto-blocked with visual lock states
  when prerequisites are not `DONE`; blocked action buttons are disabled in the UI.
- **State-Based Permissions UI** — PM sees full controls but the "Mark Done" action is
  locked on `IN_PROGRESS` tasks; engineers only see actions allowed by role + state.
- **Optimistic Locking UX** — stale writes surface a 409 Conflict dialog instead of
  silently overwriting data.
- **EzFilter Table** — pagination, exact filters, partial search, and sorting following
  the NodeWave standard query contract.
- **Client Guest Portal** — aggregate metrics ("50% Complete"), only client-visible
  deliverables, identities masked by the API.
- **Daily Standup Auto-Summary modal** — per-department "completed yesterday" and
  "blocked today" rendered from the audit trail.
- **Assessor Quick-Switcher** — one-click sign-in as PM / UI/UX / Frontend / Backend /
  Client Guest for fast evaluation.

## Stack

| Area      | Tech                                                     |
| --------- | -------------------------------------------------------- |
| Framework | Next.js 16 (App Router, Turbopack)                        |
| UI        | React 19, TypeScript strict, Tailwind CSS 4, Radix UI     |
| Data      | TanStack Query 5 + Axios                                  |
| State     | Zustand 5                                                |
| Forms     | React Hook Form + Zod                                     |
| Tooling   | Biome, Husky, Commitlint (Conventional Commits)           |

## Getting Started

```bash
bun install
cp .env.example .env.local   # set NEXT_PUBLIC_BE_URL to the backend origin
bun run dev                  # http://localhost:3000
```

The app expects the backend at `NEXT_PUBLIC_BE_URL` (default `http://localhost:4000`).

## Scripts

| Script                | Description                    |
| --------------------- | ------------------------------ |
| `bun run dev`         | Start dev server               |
| `bun run build`       | Production build               |
| `bun run start`       | Start production server        |
| `bun run lint`        | Biome check on `src/`          |
| `bun run lint:eslint` | ESLint (Next.js rules)         |
| `bun run format`      | Biome format `src/`            |

## Seeded Demo Accounts

Use the 1-Click Role Switcher on the login page, or sign in with password
`Password123!`:

- Product Manager — `pm@nodewave.id`
- UI/UX Engineer — `uiux@nodewave.id`
- Frontend Engineer — `fe@nodewave.id`
- Backend Engineer — `be@nodewave.id`
- Client Guest — `client@acmecorp.com`
