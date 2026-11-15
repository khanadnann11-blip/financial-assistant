# Folio — AI Financial Assistant

A working personal finance MVP with a responsive dashboard, transaction search, budgets, savings goals, manual account tracking, a cash-flow scenario, and evidence-backed conversational answers.

**Status:** initial MVP, suitable for local use and evaluation. This is not the completed production platform described by the original implementation plan. Live bank aggregation, regulated financial advice, payments, trading, email verification/recovery, and production compliance operations are not implemented.

## Quick start

Requires **Node.js 24 or later** and npm. SQLite is provided by Node's built-in `node:sqlite` module (which may print an experimental warning).

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Choose **Explore the demo** for an isolated workspace with sample data, or create an account for a blank workspace. Each demo session gets its own records. Demo data is dated relative to the current month and excludes future transactions.

To build and run production assets:

```bash
npm run build
npm start
```

Production session cookies require HTTPS (localhost is treated specially by browsers). See [deployment notes](docs/DEPLOYMENT.md) before hosting the application.

## What works

- Email/password registration and sign-in, with scrypt password hashes and revocable, hashed session tokens.
- Per-user persistent SQLite workspaces and server-side authorization on every financial operation.
- Six-month income/spending chart, spending categories, account totals, budget alerts, and goal progress.
- Transaction entry, merchant/category/account search, month/category filtering, recategorization, and deletion.
- Monthly category budget creation, replacement, and deletion.
- Savings goal creation, saved-amount updates, contribution calculations, and deletion.
- Manual checking, savings, and credit account snapshots, with balance updates.
- A simple, explicitly qualified checking cash-flow forecast.
- Financial assistant with supporting metrics and source transactions.
- JSON export and permanent deletion from the active application database.
- Responsive mobile navigation and reduced-motion support.

## Financial conventions

All values use **USD integer cents**. Transaction amounts are positive for money in and negative for money out. Categorize payroll as `Income`. Positive refunds belong to the original spending category. `Transfer` transactions are excluded from income and spending. Pending transactions are excluded from analytics. Income category corrections are summed with their sign.

Account balances are **manual snapshots**. Recording a transaction does not update a snapshot. Credit card liabilities should be negative. Goals are separately tracked manual amounts and do not move funds or allocate balances automatically. This prevents the app from implying a live or reconciled connection that does not exist.

The forecast uses the current checking balance minus the current month's average daily posted spending multiplied by the remaining calendar days. It assumes no future income and excludes pending transactions. Its ±25% spending range is a sensitivity scenario, not a confidence interval. It does not model bill due dates, payroll schedules, or account reconciliation. A mid-month lump expense can distort it.

## Assistant configuration

The app works **without an API key** using supported local question patterns:

- “Where is my money going?”
- “Compare spending with last month”
- “What did I spend on dining in 2026-10?”
- “How are my budgets?”
- “What is my cash-flow forecast?”
- “How much should I save for my goals?”

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in `.env.local` to enable broader model-based intent classification. Default model: `gpt-4.1-mini`. The model receives the user's question and the intent schema, **not account or transaction records**. Questions may themselves contain sensitive text, so users should avoid entering identifiers. Model output is validated against a fixed schema and cannot execute SQL or financial actions. Calculations and final financial wording come from local code. Timeouts or invalid model output fall back to local classification.

Supported periods are this month, last month, or one explicit `YYYY-MM`. Other common date windows prompt clarification. The assistant is deliberately bounded; it is not unrestricted generative financial advice. Chat messages are kept in client memory and not persisted.

## Verification

```bash
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Unit tests cover refunds, transfers, pending activity, cent arithmetic, forecast assumptions, goals, grounded answers, password verification, session revocation, per-user isolation, atomic rollback, and throttling. Browser tests cover demo onboarding, transaction creation/search, cited assistant answers, goal creation, exports, rejected cross-origin writes, and mobile layout.

CI runs type checks, unit tests, a production build, and Chromium integration tests. Run an independent security assessment before handling production customer financial data.

## Architecture

- **Next.js App Router + React + TypeScript:** interface and same-origin API.
- **SQLite:** user records, financial documents, sessions, and rate limits; WAL mode, foreign keys, prepared statements, atomic document updates.
- **Zod:** request and model-output validation.
- **Lucide:** local SVG icons; no external image/font dependencies.
- **Optional OpenAI API:** bounded intent routing only.

```text
src/app/                     Pages, global styles, authenticated API
src/components/workspace.tsx Responsive application and forms
src/lib/finance.ts           Deterministic financial calculations
src/lib/assistant.ts         Intent routing, grounded responses, evidence
src/lib/store.ts             Persistence, authentication, authorization helpers
src/lib/seed.ts              Isolated relative-date demo data
src/lib/types.ts             Shared financial types
 tests/                      Unit and browser integration tests
 docs/                       Architecture, deployment, and remaining roadmap
```

See [architecture](docs/ARCHITECTURE.md), [deployment](docs/DEPLOYMENT.md), and [remaining roadmap](docs/ROADMAP.md).
