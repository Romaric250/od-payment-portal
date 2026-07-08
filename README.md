# Open Dreams Payment Portal

Standalone payment portal for [Open Dreams](https://open-dreams.org) — public MTN/Orange Money checkout via Fapshi, plus an authenticated admin dashboard.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + shadcn-style UI components
- **MongoDB** + **Prisma**
- **NextAuth.js** (admin credentials auth)
- **Fapshi** (Direct Pay — MTN MoMo & Orange Money)
- **Resend** (transactional email)
- **UploadThing** (category image uploads)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 3. Set up the database

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

The seed script creates a super admin and sample categories.

### 4. Run locally

```bash
npm run dev
```

- Public site: [http://localhost:3000](http://localhost:3000)
- Admin login: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

Default seed credentials (change immediately in production):

- Email: `admin@open-dreams.org`
- Password: `ChangeMe123!`

## Fapshi webhook

Configure your Fapshi service webhook URL to:

```
https://your-domain.com/api/webhooks/fapshi
```

The webhook verifies payloads via HMAC signature (if `FAPSHI_WEBHOOK_SECRET` is set) or `apiuser`/`apikey` headers.

## UploadThing

Create an app at [uploadthing.com](https://uploadthing.com) and set `UPLOADTHING_TOKEN` in `.env`. Category images are uploaded from the admin dashboard.

## Project structure

```
src/
├── app/
│   ├── (public)/          # Landing + checkout flow
│   ├── admin/             # Admin dashboard
│   └── api/               # Public + admin API routes
├── components/
│   ├── ui/                # Shared UI primitives
│   ├── public/            # Public-facing components
│   └── admin/             # Dashboard components
└── lib/                   # Auth, Fapshi, Prisma, validators, etc.
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to MongoDB |
| `npm run db:seed` | Seed super admin + sample categories |

## Deployment

Recommended: **Vercel**. Set all environment variables from `.env.example` in your Vercel project settings.

## License

Private — Open Dreams
