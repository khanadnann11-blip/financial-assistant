# Deployment and operations

## Hosting requirements

Use a Node.js 24+ host with a persistent writable volume. This application uses a local SQLite file, so an ephemeral serverless filesystem is not an appropriate production data store. Run a **single application instance** with this implementation; migrate to PostgreSQL and shared rate limiting before horizontal scaling.

1. Install with `npm ci`.
2. Set `DATABASE_PATH` to a path on a persistent volume, such as `/app/data/finance.sqlite`.
3. Set `APP_ORIGIN` to the exact public HTTPS origin, such as `https://finance.example.com` (no trailing slash). This is used to validate mutation origins behind a proxy.
4. Optionally configure `OPENAI_API_KEY` and `OPENAI_MODEL` on the server. Never expose these through `NEXT_PUBLIC_` variables.
5. Run `npm run build`, then `npm start` behind an HTTPS reverse proxy.
6. Restrict direct access to the application port. The proxy must **overwrite**, rather than append to untrusted, `X-Forwarded-For` headers. Authentication throttling uses the first address in that trusted header. Without a proxy, omit the header and requests share the local bucket.
7. Use encryption at rest on the hosting volume and encrypted backups. The app itself does not encrypt individual SQLite columns. Limit filesystem and administrative access.
8. Use an online SQLite backup mechanism or stop the app before copying the database. Copying only the main file while WAL writes are active can produce an incomplete backup. Test restoration.

## Environment variables

| Variable         | Default                 | Purpose                                  |
| ---------------- | ----------------------- | ---------------------------------------- |
| `DATABASE_PATH`  | `./data/finance.sqlite` | Persistent SQLite file                   |
| `APP_ORIGIN`     | Request URL origin      | Exact trusted origin for mutation checks |
| `OPENAI_API_KEY` | Unset                   | Optional question classification         |
| `OPENAI_MODEL`   | `gpt-4.1-mini`          | Model supporting JSON output             |

Session cookies expire after seven days. Expired sessions and unused demo users are cleaned on the next authentication request. For a public deployment, add scheduled cleanup, demo signup quotas, bot protection, and operator metrics.

## Privacy and deletion

Account deletion removes active database records and cascades session deletion. SQLite page history, WAL files, hosting snapshots, and backups are outside the guarantee of immediate secure erasure. Define and disclose a backup retention policy, restrict backup access, and propagate deletion if restoring backups. The initial app has no remote bank provider tokens and no persisted chat history.

Logs intentionally contain API error names and endpoint paths, not request bodies. Reverse-proxy logs, hosting telemetry, and third-party processing still require operator review. When optional AI routing is enabled, user questions go to the configured model provider. Review the provider's terms and retention controls before public launch.

## Current production gaps

Do not treat the MVP as a compliance certification. Before inviting real customers, implement email verification and recovery, security monitoring, managed encryption/key handling, independent penetration testing, accessibility review, legal review in the launch jurisdiction, incident response, automated backup verification, and documented retention practices. The content security policy allows inline Next.js scripts; nonce-based hardening is a follow-up. No live banking adapter or webhook ingestion exists yet.
