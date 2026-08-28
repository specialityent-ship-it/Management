# Deploying

This is a standard Next.js app with a Postgres database. Anything that can run
Next.js will host it; the steps below use Vercel plus a managed Postgres
because that is the least setup.

Budget about an hour for the first deploy, most of it waiting on DNS and
third-party approvals.

---

## 1. Create the database

Create a Postgres database with any managed provider (Neon, Supabase, Railway,
Amazon RDS). You need one thing from it: the connection string, which looks
like

```
postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

Prefer a region close to your patients — the app talks to the database on
every page load.

## 2. Deploy the app

1. Import the repository into Vercel (New Project → import from GitHub).
2. Framework preset: **Next.js**. Leave the build command as is — the
   `build` script already runs `prisma generate`.
3. Add the environment variables from `.env.example` (Settings → Environment
   Variables). At minimum:

   | Variable       | Value                                               |
   | -------------- | --------------------------------------------------- |
   | `DATABASE_URL` | the connection string from step 1                     |
   | `APP_URL`      | your final URL, e.g. `https://clinic.example.com`     |
   | `AUTH_SECRET`  | `openssl rand -base64 48`                             |
   | `CRON_SECRET`  | `openssl rand -hex 24`                                |
   | `CLINIC_*`     | your real clinic name, phone, email, address          |

   Everything else is optional and can be added later — the app boots without
   it and shows each feature as unconfigured at `/admin/settings`.

4. Deploy.

## 3. Create the schema and your first login

From your machine, with `DATABASE_URL` pointing at the production database:

```bash
npm install
DATABASE_URL="postgresql://…" npx prisma db push
DATABASE_URL="postgresql://…" SEED_ADMIN_EMAIL="you@clinic.com" \
  SEED_ADMIN_PASSWORD="a-strong-password" npm run db:seed
```

The seed creates your admin login plus demo doctors and services. Replace the
demo content with your own from `/admin` once you can sign in.

> Do not skip `SEED_ADMIN_PASSWORD`. Without it the seed uses a well-known
> default password.

## 4. Point your domain at it

Add the domain in Vercel (Settings → Domains) and follow its DNS
instructions. Then set `APP_URL` to the final `https://` address and redeploy,
so links in emails and the Razorpay callback use the right host.

---

## Scheduled jobs

`vercel.json` registers two cron jobs: appointment reminders and scheduled
social posts. Vercel automatically sends `Authorization: Bearer $CRON_SECRET`
on cron requests, which is exactly what the routes check — so just make sure
`CRON_SECRET` is set in the environment.

Both are set to hourly. **Vercel's Hobby plan only runs cron jobs once a day**,
which is too infrequent for reminders; use Pro, or trigger the two URLs from
any external scheduler instead:

```
curl -s -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/reminders
curl -s -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/publish
```

Not on Vercel? Delete `vercel.json` and use your platform's scheduler, or a
plain crontab, against those two URLs.

---

## Turning on the optional features

Each is independent. `/admin/settings` shows which are live.

| Feature            | What you need                                                                 |
| ------------------ | ----------------------------------------------------------------------------- |
| Online payments    | Razorpay account → API keys, then add a webhook (see below)                    |
| Email notifications| SMTP credentials from your mail provider                                       |
| WhatsApp           | Meta WhatsApp Cloud API + templates approved in WhatsApp Manager               |
| AI chatbot         | An Anthropic API key                                                           |
| Instagram posting  | Instagram Business/Creator account linked to a Facebook Page + a long-lived token |
| YouTube posting    | Google Cloud OAuth client with YouTube Data API v3 enabled                     |

**Razorpay webhook.** After deploying, add a webhook in the Razorpay dashboard
pointing at `https://your-domain/api/webhooks/razorpay`, subscribed to
`payment.captured`, `payment.failed` and `refund.processed`. Put its signing
secret in `RAZORPAY_WEBHOOK_SECRET`. Without this, a patient who closes the
tab mid-payment can pay without the booking being confirmed.

**WhatsApp and Instagram both need approval from Meta**, which can take days.
Start those applications early; everything else works without them.

See the README for the details of each integration.

---

## Before real patient data

- [ ] Change every seeded password; delete any staff account you do not need.
- [ ] Confirm the site is HTTPS-only (the session cookie is `secure` in production).
- [ ] Turn on automated backups and check the restore actually works.
- [ ] Restrict who has the `ADMIN` role.
- [ ] Review your obligations on medical records, retention and consent — in
      India, the DPDP Act and the applicable clinical establishment rules.
- [ ] Replace the demo doctors, services and testimonials with your own.
- [ ] Send yourself a test booking end to end: book, pay, confirm, and check
      the confirmation arrives.
