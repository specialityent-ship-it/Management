# OPD & OT Management System

A single application covering the whole patient pathway for a clinic that runs
an outpatient department and an operation theatre:

- **Public website** — services, doctor profiles, about and contact pages.
- **Online booking** — live slot availability, booking requests, deposits.
- **Payments** — Razorpay checkout, signature verification and webhooks.
- **CRM** — a lead pipeline with owners, activities and follow-up reminders.
- **OPD management** — confirm, check in, complete or cancel appointments.
- **OT management** — theatre scheduling with a surgical safety checklist.
- **AI chatbot** — a website assistant grounded in your real services and doctors.
- **Social publishing** — one click to post to Instagram and YouTube, or schedule it.

Built with Next.js (App Router), TypeScript, Postgres and Prisma.

---

## Quick start

```bash
npm install
cp .env.example .env          # then fill in the values you have
npm run db:push               # create the schema
npm run db:seed               # demo doctors, services, theatres and logins
npm run dev
```

Open http://localhost:3000. The staff console is at `/admin`.

Seeded logins (change these before going anywhere near production):

| Role      | Email                   | Password      |
| --------- | ----------------------- | ------------- |
| Admin     | `admin@example.com`     | `changeme123` |
| Reception | `reception@example.com` | `changeme123` |
| Doctor    | `doctor@example.com`    | `changeme123` |

Override with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before seeding.

**The app runs with an empty `.env`.** Every integration is optional and
degrades to a clear message rather than an error, so you can start with the
website and booking flow and switch on payments, the chatbot and social
publishing as credentials arrive. `/admin/settings` shows what is live.

---

## How the pieces fit together

### Booking and scheduling

Availability is derived, never stored as rows of empty slots. A doctor has
weekly `Availability` windows; `availableSlots()` expands the window for a
given day and subtracts existing appointments, scheduled theatre cases and
time off. The slot list a patient sees is advisory — `assertSlotFree()` runs
again inside the booking transaction, so two people racing for the last slot
cannot both get it (the second sees a 409).

Booking a slot creates or matches a `Patient` (by phone, so a returning
patient keeps one record), creates the `Appointment`, and files a CRM `Lead`
so marketing can attribute the booking and reception can chase anything that
stalls before payment.

Services with `requiresDeposit` start at `PENDING_PAYMENT` and only become
`CONFIRMED` once the deposit is paid. Everything else starts at `REQUESTED`
for staff to confirm.

Surgical (`OT`) services are deliberately **not** self-bookable. Surgery is
scheduled by staff after a consultation — the public flow offers
consultations, teleconsults and diagnostics, and the booking API rejects an OT
service even if one is posted directly.

### Payments (Razorpay)

1. `POST /api/payments/order` creates a Razorpay order and a `Payment` row.
   An unpaid order is reused, so refreshing checkout does not create duplicates.
2. Razorpay Checkout opens in the browser and returns a signed response.
3. `POST /api/payments/verify` recomputes the HMAC and only then marks the
   payment paid and confirms the appointment. The browser is never trusted.
4. `POST /api/webhooks/razorpay` is the authoritative record — it catches
   `payment.captured`, `payment.failed` and `refund.processed` even if the
   patient closes the tab mid-payment.

Set up: create keys in the Razorpay dashboard, put them in `RAZORPAY_KEY_ID`
/ `RAZORPAY_KEY_SECRET` / `NEXT_PUBLIC_RAZORPAY_KEY_ID`, then add a webhook
pointing at `https://your-domain/api/webhooks/razorpay` subscribing to those
three events and put its secret in `RAZORPAY_WEBHOOK_SECRET`.

### AI chatbot

`src/lib/chatbot.ts` builds its system prompt from your live `Service` and
`Doctor` rows, so the assistant quotes real names, durations and prices and
cannot invent a service you do not offer. It is instructed not to diagnose,
not to interpret symptoms or reports, not to advise on medication, and to
redirect medical emergencies to emergency services. Conversations are stored
and readable at `/admin/conversations`.

Set `ANTHROPIC_API_KEY` to switch it on.

### Social publishing

A `SocialPost` fans out to one `SocialTarget` per platform, so a failure on
Instagram does not roll back YouTube and you can retry just the failed leg.
"Publish now" posts immediately; setting a schedule leaves it for the cron
route.

**Instagram** needs a Business or Creator account linked to a Facebook Page,
and a long-lived page access token with `instagram_basic`,
`instagram_content_publish` and `pages_read_engagement`. Set
`INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_BUSINESS_ACCOUNT_ID`. Publishing is
two-phase: a media container is created from your public media URL, then
published once Meta has fetched it (videos are polled until ready).

**YouTube** needs a Google Cloud project with the YouTube Data API v3
enabled and an OAuth 2.0 Web client. Set `YOUTUBE_CLIENT_ID`,
`YOUTUBE_CLIENT_SECRET` and `YOUTUBE_REDIRECT_URI`, sign in as an admin and
visit `/api/social/youtube/connect` once. The callback logs a refresh token —
put it in `YOUTUBE_REFRESH_TOKEN` so publishing survives redeploys.

Both platforms fetch media from a **publicly reachable URL** — they cannot
read a local file, so host media on a CDN, S3 or similar and paste the link.

### Scheduled publishing

`GET /api/cron/publish` publishes any post whose scheduled time has passed.
It is protected by `CRON_SECRET`, passed either as `Authorization: Bearer …`
or `?secret=…`. Point a scheduler at it every few minutes:

```
*/5 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/publish
```

On Vercel, add it to `vercel.json` as a cron job instead.

### Operation theatre

Each case carries a trimmed WHO surgical safety checklist, seeded
automatically across four phases (before the day, sign in, time out, sign
out). Cases move `PLANNED → PRE_OP → SCHEDULED → IN_THEATRE → RECOVERY →
COMPLETED`. A theatre cannot hold two overlapping cases and a surgeon in
theatre is automatically unavailable for OPD slots in the same window.

---

## Project layout

```
prisma/schema.prisma      Domain model
prisma/seed.ts            Demo data and staff logins
src/app/(site)/           Public website + booking flow
src/app/admin/            Staff console (auth-guarded)
src/app/api/              Booking, payments, chat, social, cron, webhooks
src/lib/scheduling.ts     Slot generation and conflict detection
src/lib/razorpay.ts       Order creation and signature verification
src/lib/chatbot.ts        Grounded assistant
src/lib/social/           Instagram, YouTube and the fan-out publisher
```

## Commands

| Command              | What it does                       |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Development server                 |
| `npm run build`      | Production build (runs `prisma generate`) |
| `npm run typecheck`  | TypeScript, no emit                |
| `npm run db:push`    | Push schema to the database        |
| `npm run db:migrate` | Create a migration                 |
| `npm run db:seed`    | Seed demo data                     |
| `npm run db:studio`  | Browse the database                |

---

## Before going live

This handles patient data, so treat the following as required rather than
optional:

- Replace every seeded password and generate a fresh `AUTH_SECRET`.
- Serve over HTTPS only — the session cookie is marked `secure` in production.
- Use a managed Postgres with encryption at rest and automated backups.
- Restrict who gets `ADMIN`; the roles are `ADMIN`, `DOCTOR`, `RECEPTION`,
  `OT_COORDINATOR` and `MARKETING`.
- Review your local rules on medical records, retention and consent
  (in India, the DPDP Act and the applicable clinical establishment rules)
  before storing real patient data.
- Add transactional email or WhatsApp for booking confirmations — the schema
  and status transitions are ready for it, but no messaging provider is wired
  in yet.
