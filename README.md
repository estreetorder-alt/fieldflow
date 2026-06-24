# FieldFlow — Field Service Platform

Professional field inspection and survey management platform. Built with Next.js 15, Tailwind CSS v4, and an in-memory store (suitable for testing; swap to a database for production).

## Test Credentials

| Role  | Email            | Password   |
|-------|-----------------|-----------|
| Admin | admin@test.com  | admin123  |
| Agent | agent@test.com  | agent123  |
| Agent | agent2@test.com | agent123  |
| Client| client@test.com | client123 |
| Client| client2@test.com| client123 |

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import this repo
3. Framework will be auto-detected as **Next.js**
4. Leave all settings as default — click **Deploy**
5. Done. No environment variables required for the test build.

## Project Structure

```
app/
  _api/          # API routes (auth, orders, agents, pricing, SSE events)
  admin/         # Admin dashboard
  agent/         # Agent dashboard
  client/        # Client dashboard + order detail
  login/         # Login page
  register/      # Client & agent registration
  (marketing)/   # Public pages: home, services, coverage, contact, etc.
lib/
  store.ts       # In-memory data store with seed data
  pricing.ts     # Pricing calculation logic
  email.ts       # Email stub (logs to console)
middleware.ts    # Route-based auth guard (cookie-based roles)
```

## ⚠️ Important: In-Memory Store

Data lives in Node.js `global` memory. On Vercel:
- Data **persists** within a single serverless function instance
- Data **resets** on cold starts or new deployments
- This is fine for demo/testing — migrate to a real DB (Postgres, SQLite on a VM) for production

## Production Roadmap

- [ ] Replace in-memory store with PostgreSQL (Vercel Postgres or NeonDB)
- [ ] Add proper auth with JWT / sessions
- [ ] Integrate real email sending (Resend)
- [ ] Add file storage for photos (Cloudflare R2 or S3)
- [ ] Move to Oracle Cloud VM + custom domain
