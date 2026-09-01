# ClinicOS - Vercel Deployment Guide

This repository is fully pre-configured for seamless zero-config deployment on **[Vercel](https://vercel.com)**.

---

## 🚀 Quick Start: 2-Minute Deployment

### 1. Push to GitHub
Ensure all your latest changes and the Vercel configuration files are pushed to your GitHub repository:
```bash
git add .
git commit -m "Configure project for Vercel deployment"
git push origin master
```

### 2. Import Project in Vercel
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Select your `clinic-os` repository.
4. **Project Configuration Settings**:
   - **Framework Preset**: `Vite` (automatically detected)
   - **Root Directory**: `./` (leave default repository root)
   - **Build Command**: `npm run build` or `npm run build:client` (automatically detected from `vercel.json`)
   - **Output Directory**: `client/dist` (automatically detected from `vercel.json`)

---

## 🔐 Environment Variables Configuration

In your Vercel Project Settings (**Settings → Environment Variables**), add the following variables:

### Database (MySQL)
| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `DB_HOST` | Cloud MySQL Host / IP | `aws.connect.psdb.cloud` or `mysql-aiven.com` |
| `DB_PORT` | MySQL Port | `3306` (or provider specific) |
| `DB_NAME` | Database Name | `clinic_os` |
| `DB_USER` | Database User | `admin` |
| `DB_PASSWORD` | Database Password | `your-db-password` |
| `DB_SSL` | Enable SSL for Cloud DB | `true` |
| `DB_CONNECTION_LIMIT` | Max Pool Connections | `10` |

*Alternatively, if your cloud provider provides a single connection URL (TiDB, PlanetScale, Railway, Aiven):*
| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Full MySQL connection string | `mysql://user:pass@host:3306/clinic_os?ssl={"rejectUnauthorized":true}` |

### Authentication & App
| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `JWT_SECRET` | Strong random secret for token signing | *Generate a random 64-character hex string* |
| `JWT_EXPIRES_IN` | JWT token lifespan | `7d` |
| `FRONTEND_URL` | Your Vercel production URL | `https://your-project.vercel.app` |

### Email OTP (Brevo / Sendinblue)
| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `BREVO_API_KEY` | Brevo API Key | `xkeysib-...` |
| `BREVO_SENDER_EMAIL` | Verified sender email | `support@yourdomain.com` |
| `BREVO_SENDER_NAME` | Sender display name | `ClinicOS` |
| `OTP_EXPIRATION_MINUTES` | OTP expiry window in minutes | `10` |

---

## 🗄️ Setting Up a Free Cloud MySQL Database

ClinicOS requires a MySQL database. You can use any free/managed cloud MySQL service:
1. **[TiDB Cloud (Serverless)](https://tidbcloud.com/)**: Free 5 GB MySQL-compatible serverless database with built-in SSL.
2. **[Aiven for MySQL](https://aiven.io/)**: Free tier managed MySQL database.
3. **[Railway](https://railway.app/)**: 1-click managed MySQL database.
4. **[Amazon RDS / Aurora](https://aws.amazon.com/rds/)**: Production-grade MySQL database.

### Running Migrations & Seeding Cloud DB
Before or after deploying, run migrations against your cloud database from your local terminal:
```bash
# Point to your cloud database in server/.env or export DB variables
DB_HOST=your-cloud-host.com DB_USER=your_user DB_PASSWORD=your_pass DB_SSL=true npm run --prefix server db:migrate
DB_HOST=your-cloud-host.com DB_USER=your_user DB_PASSWORD=your_pass DB_SSL=true npm run --prefix server db:seed
```

---

## ⚙️ Architecture & How It Works on Vercel

```
                        ┌──────────────────────────────────────┐
                        │            Vercel Edge               │
                        └──────────────────┬───────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
         Route: /api/*                                 Route: /* (SPA)
                    │                                             │
    ┌───────────────▼───────────────┐             ┌───────────────▼───────────────┐
    │  Vercel Serverless Function   │             │   Vite React SPA (client/dist)│
    │        (/api/index.js)        │             │      (HTML5 PushState SPA)    │
    │               │               │             └───────────────────────────────┘
    │    ClinicOS Express Backend   │
    │  (Auth, Appointments, Rx,     │
    │   Billing, Messages, Brevo)   │
    └───────────────┬───────────────┘
                    │
            ┌───────▼───────┐
            │  Cloud MySQL  │
            └───────────────┘
```

- **Frontend (Vite React)**: Built into `client/dist` and served statically via Vercel Edge CDN with asset caching (`/assets/* -> Cache-Control: max-age=31536000`).
- **Backend (Express)**: Exposed through `/api/index.js` as a Vercel Serverless Function with automatic connection pooling and SSL support.
- **Client Routing**: All sub-routes (e.g., `/dashboard`, `/appointments`, `/patients`) route to `client/dist/index.html` via SPA fallback rules in `vercel.json`.
