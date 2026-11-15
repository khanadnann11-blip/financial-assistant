# Remaining implementation roadmap

This repository delivers the manually maintained MVP and the foundation for the broader plan. The following work remains before the envisioned live financial platform can launch.

## 1. Identity and operations

Add verified email, password recovery, passkeys/MFA, session/device management, administrative audit trails, migrations, scheduled cleanup, abuse controls, and monitoring. Gate completion on recovery-flow tests, unauthorized-access tests, backup restoration, and security assessment findings.

## 2. Normalized financial storage

Migrate financial documents to PostgreSQL tables for connections, accounts, balances, transactions, categories, overrides, goals, budgets, and synchronization jobs. Preserve integer/decimal currency accuracy and per-record provenance. Add ownership constraints and cross-user authorization tests.

## 3. Read-only bank integration

Choose an aggregation provider for one launch country. Implement hosted consent, encrypted token storage, revocation, signed webhooks, idempotent jobs, pending-to-posted reconciliation, duplicate handling, retries, freshness indicators, and provider deletion. Never ask users for bank passwords directly. Launch only after replay tests and provider outage/disconnection tests pass.

## 4. Forecasting and recurrence

Replace the current spending-rate scenario with user-confirmed recurring income and obligations, historical variable spending, and editable assumptions. Backtest using point-in-time historical data and compare with the existing simple baseline. Distinguish sensitivity ranges from statistically calibrated forecast intervals.

## 5. Notifications and richer assistance

Build opt-in notification preferences, due-date reminders, privacy-preserving delivery, supported custom date ranges, merchant-level natural-language search, and a versioned educational knowledge base. Expand the evaluation set to 200–500 representative and adversarial questions before broadening model capabilities.

## 6. Private beta gate

Complete launch-country legal review, financial accuracy review, accessibility testing, independent penetration testing, incident response drills, operational dashboards, provider contracts, retention/deletion verification, and a small consented pilot. Review support load and unit economics before increasing access.

Money movement, trading, underwriting, and individualized regulated advice require separate product and legal scope decisions; they are not implied by the current assistant.
