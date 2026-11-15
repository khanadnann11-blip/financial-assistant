# Architecture

The MVP is a single Next.js application with a server-side finance domain layer. The browser never sends a user identifier to select financial data: every authenticated request derives its owner from an opaque session cookie whose SHA-256 digest is stored server-side.

## Data model

`users` stores a unique email for registered users, name, salted scrypt hash, demo flag, update time, and a JSON financial document. Financial documents contain accounts, transactions, budgets, and goals. `sessions` references users with cascading deletion and stores token digests and expirations. `limits` tracks expiring request buckets. All SQL uses bound parameters. Financial document mutation is synchronous within `BEGIN IMMEDIATE`/commit/rollback.

Document storage keeps the MVP small. A production banking implementation should normalize accounts, transactions, balance snapshots, synchronization runs, provider identifiers, and audit events into independent tables, with migrations and reconciliation constraints.

## API

All endpoints are under `/api`. Mutations require a matching browser origin; reads require an authenticated session except for the sign-in and demo creation flows. Responses disable caching. Body reads are capped at 32 KiB. Request and financial-value validation is enforced on the server. Account/goal/transaction updates must refer to records in the current user's document.

| Method | Endpoint                       | Behavior                                                      |
| ------ | ------------------------------ | ------------------------------------------------------------- |
| POST   | `/demo`, `/register`, `/login` | Create or authenticate a workspace session                    |
| POST   | `/logout`                      | Revoke current session                                        |
| GET    | `/state`                       | Current user's complete financial workspace                   |
| GET    | `/export`                      | Download that workspace as JSON                               |
| POST   | `/accounts`                    | Add manual account snapshot                                   |
| PATCH  | `/accounts`                    | Replace owned account balance                                 |
| POST   | `/transactions`                | Add owned transaction                                         |
| PATCH  | `/transactions`                | Correct owned transaction category                            |
| DELETE | `/transactions`                | Remove owned transaction                                      |
| POST   | `/budgets`                     | Create/replace category budget                                |
| DELETE | `/budgets`                     | Remove category budget                                        |
| POST   | `/goals`                       | Create savings goal                                           |
| PATCH  | `/goals`                       | Replace owned goal saved amount                               |
| DELETE | `/goals`                       | Remove owned goal                                             |
| POST   | `/assistant`                   | Return locally calculated response and evidence               |
| DELETE | `/me`                          | Delete current user's data after explicit DELETE confirmation |

## Assistant trust boundary

Optional model inference chooses an enumerated intent, category, and explicit month. It cannot choose a user, run arbitrary tools, access the database, or produce the final financial numbers. Only deterministic code reads the authenticated workspace, computes results, and constructs explanatory text. Provider failures use local intent rules. Source transaction IDs are resolved only inside the current client workspace.

The model is not called automatically in the background. No bank data is included in model requests; users can still put sensitive information into questions. No account tokens, payments, or trading capabilities exist in the MVP.
