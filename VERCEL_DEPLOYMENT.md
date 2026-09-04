# ClinicOS Vercel deployment

This is a deployment checklist, not a zero-configuration guarantee. Apply the database migration and configure every production secret before directing traffic to the application.

## Project settings

- Framework: Vite
- Repository root: project root
- Build command: `npm run build --prefix client`
- Output directory: `client/dist`
- API entry point: `api/index.js`

Vercel terminates TLS before the Express application. The API trusts exactly one proxy hop when `VERCEL=1`, enforces HTTPS from the trusted protocol signal, and emits HSTS on secure production responses.

## Required production environment

| Variable | Requirement |
| --- | --- |
| `NODE_ENV` | `production` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Managed MySQL credentials |
| `DB_SSL` | `true` for a remote database |
| `DB_SSL_REJECT_UNAUTHORIZED` | `true`; `false` is rejected in production |
| `DB_SSL_CA_BASE64` or `DB_SSL_CA_PATH` | Provider CA when it is not in the platform trust store |
| `JWT_SECRET` | Unique random value of at least 32 characters; 64+ recommended |
| `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRES_IN` | Expected token claims and lifetime |
| `FRONTEND_URL` / `ALLOWED_ORIGINS` | Exact HTTPS browser origins, comma-separated where needed |
| `ENFORCE_HTTPS` | `true` |
| `CRON_SECRET` | Random scheduler bearer secret; Vercel attaches it to cron requests |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | Required for live OTP/reminder email |

Never upload `server/.env`. Configure values in Vercel's environment settings and rotate any credential that has previously existed in a local plaintext environment file.

## Database and scheduler

1. Back up the target database.
2. Run `npm run db:migrate --prefix server` from a controlled environment using the production variables.
3. Do not run the seed command against production.
4. Deploy and check `/api/health` over HTTPS.
5. Confirm Vercel Cron invokes `/api/internal/appointment-reminders`; `vercel.json` schedules it hourly. The endpoint rejects requests without the matching bearer secret.

For a persistent Node deployment rather than Vercel, either terminate TLS at a trusted reverse proxy with `TRUST_PROXY` configured or provide `TLS_CERT_PATH` and `TLS_KEY_PATH`. The process-local reminder worker starts automatically in that environment.

## Release checks

- Sign-in and expiry redirect
- CORS rejection from an unlisted origin
- Role/clinic authorization for clinical records
- Prescription and receipt PDF download
- Reminder delivery and deduplication
- Database backup, restore, monitoring, and alerting owned by the deployment platform

See `server/.env.example`, `README.md`, `SECURITY.md`, and `SRS_TRACEABILITY.md` for the maintained configuration and scope.
