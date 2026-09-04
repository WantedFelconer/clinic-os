# ClinicOS

ClinicOS is a React, Express and MySQL multi-tenant clinic-management SaaS prototype for patients, doctors/clinic owners, assistants and platform administrators.

## Architecture

- `client/`: React + Vite web application
- `server/src/routes`: REST routes
- `server/src/controllers`: authorization-aware workflows
- `server/src/models`: parameterized MySQL persistence
- `server/src/middleware`: JWT, RBAC, tenant and subscription enforcement
- `server/db/schema.sql` and `server/db/migrate.js`: schema and additive migrations
- `server/test`: focused security tests plus opt-in database integration suites

Payments and external file storage are simulated by design. Prescription and receipt PDFs are generated on demand. Video consultation is future scope.

## Safe setup

1. Copy `server/.env.example` to `server/.env` locally. Never commit it.
2. Configure MySQL and run `npm run db:migrate --prefix server`.
3. Set `JWT_SECRET` to a random value of at least 32 characters.
4. Start the API with `npm run server` and the client with `npm run client`.

The repository intentionally does not include a working `.env`. Rotate the database password, JWT secret and Brevo key found in the removed project copy.

## Production security

```ini
NODE_ENV=production
JWT_SECRET=<GENERATE_A_LONG_RANDOM_SECRET>
JWT_EXPIRES_IN=30m
JWT_ISSUER=clinic-os-api
JWT_AUDIENCE=clinic-os-web
FRONTEND_URL=https://clinic.example.com
ALLOWED_ORIGINS=https://clinic.example.com
ENFORCE_HTTPS=true
TRUST_PROXY=true
HTTPS_PORT=443
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

Set `TRUST_PROXY=true` only behind one trusted proxy hop; use a CIDR/address list for complex networks. Vercel is treated as one trusted hop. Unknown origins are rejected and production wildcard/non-HTTPS CORS entries fail startup.

For direct TLS termination in Node, set `TLS_CERT_PATH` and `TLS_KEY_PATH`. Otherwise terminate TLS at a trusted proxy; Express still enforces HTTPS. `HTTPS_HEALTHCHECK_EXEMPT=true` is available for required internal HTTP probes. HSTS is enabled without preload. Managed MySQL can use `DB_SSL_CA_PATH` or `DB_SSL_CA_BASE64`.

## Email and reminders

Configure `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME` in the deployment secret manager. Missing production credentials fail delivery; secrets and email bodies are not logged.

The standalone server polls using `APPOINTMENT_REMINDER_HOURS` and `APPOINTMENT_REMINDER_POLL_MS`. Serverless deployments can call `GET` or `POST /api/internal/appointment-reminders` with `Authorization: Bearer <CRON_SECRET>`; `vercel.json` includes the hourly Vercel Cron entry. `reminder_sent_at` prevents duplicate reminders.

## Testing

`npm test` runs safe, database-independent remediation tests. Database suites run only when explicitly enabled:

```ini
RUN_INTEGRATION_TESTS=true
TEST_DB_NAME=clinic_os_test
```

The database name must contain `test` or `ci`. Never point tests or reset scripts at production. Apply migrations and fixtures to the isolated test database first.

Other verification commands are `npm run build` and `npm run test:unit --prefix server`. There is no configured lint script. The build passes with a large main-bundle warning; code splitting remains follow-up work.

## Operations and limits

- `GET /api/health` provides process health and standalone startup handles graceful shutdown.
- Authoritative feature names live in `server/src/config/features.js`; current FR-43 coverage is honestly partial.
- Availability, backups, recovery objectives and redundancy must be implemented and measured by the deployment platform.
- Session inactivity and OTP attempt tracking are process-local; use a shared TTL store before horizontal deployment.

See `FINAL_AUDIT.md`, `SECURITY.md` and `SRS_TRACEABILITY.md` for verified status.
