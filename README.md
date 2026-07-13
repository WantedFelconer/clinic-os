<div align="center">
  <h1>🏥 ClinicOS</h1>
  <p><strong>A unified clinic management platform for independent medical practices</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" alt="React">
    <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
    <img src="https://img.shields.io/badge/Express-000000?logo=express&logoColor=white" alt="Express">
    <img src="https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white" alt="MySQL">
  </p>
</div>

---

**ClinicOS** replaces the scattered tools clinics juggle — scheduling, patient records, prescriptions, billing — with a single, integrated platform. Built for doctors, assistants, and patients, it provides a full digital workspace out of the box.

## ✨ Features

| Area | Capabilities |
|------|-------------|
| **Appointment Scheduling** | Book, reschedule, cancel; in-person/video/phone; status tracking (confirmed, in-progress, completed, no-show) |
| **Electronic Medical Records** | SOAP notes, diagnoses, symptoms, treatment plans, follow-ups, confidentiality controls |
| **Digital Prescriptions** | Multi-line prescriptions with medication, dosage, frequency, duration, route, and instructions |
| **Payments & Billing** | Invoicing, payment tracking (cash, card, online, mobile banking), Stripe integration, discount/tax support |
| **Analytics Dashboard** | Revenue charts, appointment trends, consultation-type breakdowns, quick-stat cards |
| **Patient Portal** | Patient-facing view of appointments, prescriptions, and billing history |
| **Multi-Tenant Clinics** | Each clinic operates independently with its own staff, patients, and data |
| **Role-Based Access** | Admin, doctor, assistant, patient — each with appropriate permissions |
| **Reviews & Ratings** | Patient reviews with star ratings and admin moderation workflow |
| **Subscription Plans** | Tiered plans (Free/Starter/Professional) with feature-based access controls |
| **Notifications** | In-app notification system for appointments, payments, and messages |
| **Dark / Light Theme** | Full dark mode support via `next-themes` and CSS custom properties |

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 6, TypeScript, Tailwind CSS 4 |
| **UI Components** | Material UI 7, Radix UI primitives, shadcn/ui-style components |
| **State & Routing** | React Router 7, Axios |
| **Charts & Animations** | Recharts, Framer Motion |
| **Backend** | Node.js, Express 4 |
| **Database** | MySQL 8.0+ (with connection pooling via mysql2) |
| **Auth** | JWT, bcryptjs |
| **Payments** | Stripe |
| **Email** | Nodemailer |
| **File Uploads** | Multer |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8.0+
- pnpm (recommended) or npm

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/clinic-os.git
cd clinic-os

# Install frontend dependencies
cd client
pnpm install

# Install backend dependencies
cd ../server
npm install

# Configure environment
cp .env.example .env   # or edit the existing .env with your settings
```

### Database

```bash
# Create the database and run migrations
cd server
node db/migrate.js

# (Optional) Seed with demo data
node db/seed.js
```

### Run Development Servers

```bash
# Backend (runs on port 5000 by default)
cd server
npm run dev

# Frontend (runs on port 5173 by default)
cd client
pnpm run dev
```

## 📁 Project Structure

```
clinic-os/
├── client/                   # React frontend
│   ├── src/
│   │   ├── main.tsx          # Entry point
│   │   ├── app/
│   │   │   ├── App.tsx       # Main application
│   │   │   ├── api/          # API client modules
│   │   │   └── components/
│   │   │       └── ui/       # Reusable UI components (48+)
│   │   ├── styles/           # CSS, Tailwind, theme tokens
│   │   └── imports/          # Design assets
│   ├── vite.config.ts
│   └── package.json
│
└── server/                   # Express.js backend
    ├── src/
    │   ├── index.js          # Server entry point
    │   ├── config/           # DB connection, config
    │   ├── middleware/        # Auth, RBAC, error handling
    │   ├── models/           # Data access layer (12 models)
    │   ├── routes/           # API routes (10 modules)
    │   ├── controllers/      # Request handlers
    │   └── utils/            # Helpers
    ├── db/
    │   ├── schema.sql        # Full MySQL schema
    │   ├── migrate.js        # Migration script
    │   └── seed.js           # Demo data seeder
    └── package.json
```

## 🌐 API Overview

All API routes are prefixed with `/api`.

| Area | Base Route |
|------|-----------|
| **Auth** | `/api/auth/*` |
| **Clinics** | `/api/clinics/*` |
| **Patients** | `/api/clinics/:clinicId/patients/*` |
| **Appointments** | `/api/clinics/:clinicId/appointments/*` |
| **Medical Records** | `/api/clinics/:clinicId/medical-records/*` |
| **Prescriptions** | `/api/clinics/:clinicId/prescriptions/*` |
| **Payments** | `/api/clinics/:clinicId/payments/*` |
| **Reviews** | `/api/clinics/:clinicId/reviews/*` |
| **Subscriptions** | `/api/clinics/:clinicId/subscriptions/*` |
| **Admin** | `/api/admin/*` |
| **Health** | `GET /api/health` |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

Please ensure your code follows the existing conventions and patterns used throughout the project.

## 📄 License

All rights reserved. This project is not open-source and may not be copied, modified, or distributed without explicit permission.

---

<div align="center">
  Built with ❤️ for independent medical practices
</div>
