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

Fapshi does not take a webhook URL in `initiate-pay`. Set it **per service** on the [Fapshi dashboard](https://dashboard.fapshi.com). When a payment becomes `SUCCESSFUL`, `FAILED`, or `EXPIRED`, Fapshi POSTs the same body as `GET /payment-status/:transId`.

**Production URL**

```
https://your-domain.com/api/webhooks/fapshi
```

**Local test with ngrok**

1. Run the app: `npm run dev`
2. Expose it: `ngrok http 3000`
3. On the Fapshi dashboard, set the service webhook URL to:

```
https://YOUR-NGROK-HOST.ngrok-free.app/api/webhooks/fapshi
```

4. Set a webhook secret on the dashboard, then put the same value in `FAPSHI_WEBHOOK_SECRET`. Fapshi sends it as the `x-wh-secret` header.
5. Open `GET /api/webhooks/fapshi` in the browser to confirm ngrok reaches Next.js (`{ ok: true }`).
6. Make a sandbox/live test payment. Watch the Next.js terminal for `Fapshi webhook received`.

Fapshi sends **one** webhook per event and expects a fast `200`. After you deploy, switch the dashboard URL to the production domain.

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
