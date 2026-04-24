# Deployment Guide — Enervia Simulatie Portal

Deze gids beschrijft hoe simulatie.enervia.be naar productie gaat.

## 1. Externe services aanmaken

### Supabase
1. Ga naar [supabase.com](https://supabase.com) → nieuw project `enervia-simulatie-prod`
2. Kies regio Frankfurt of Dublin (GDPR/EU)
3. SQL editor → paste & run `supabase/migrations/0001_initial_schema.sql`
4. SQL editor → paste & run `supabase/storage-policies.sql`
5. Settings → API → kopieer:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (NOOIT in client code)

### Clerk
1. [clerk.com](https://clerk.com) → nieuw project
2. Authentication → SSO → enable Google
3. Authentication → Restrictions → Allowed email domains: `enervia.be`
4. Keys → kopieer Publishable + Secret keys
5. Webhooks → Add endpoint:
   - URL: `https://simulatie.enervia.be/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Signing secret → `CLERK_WEBHOOK_SECRET`
6. JWT Templates → Add new → name `supabase`:
   ```json
   {
     "aud": "authenticated",
     "role": "authenticated",
     "sub": "{{user.id}}"
   }
   ```

### Anthropic
1. [console.anthropic.com](https://console.anthropic.com) → API keys
2. Kopieer sleutel → `ANTHROPIC_API_KEY`
3. Zorg voor voldoende budget (Sonnet ~$3/1M input tokens; 1 offerte
   kost typisch $0.05)

### Teamleader
1. [developer.teamleader.eu](https://developer.teamleader.eu) → nieuwe app
2. Name: "Enervia Simulatie"
3. Redirect URI: `https://simulatie.enervia.be/api/teamleader/oauth/callback`
4. Scopes: `quotations.read`, `contacts.read`, `deals.read`
5. Kopieer Client ID + Secret

### Upstash Redis
1. [upstash.com](https://upstash.com) → nieuwe Redis database EU
2. TLS enabled
3. Kopieer `Connection URL` → `REDIS_URL`

### Resend (voor toekomstige emails)
1. [resend.com](https://resend.com) → verify `enervia.be` domein
2. API key → `RESEND_API_KEY`

## 2. Vercel deployment

1. `vercel.com` → Add New → Import Git Repository
2. Framework: Next.js (auto-detect)
3. Root Directory: `./`
4. Environment Variables → paste alles uit `.env.example` met productie-waarden
5. Deploy

### Custom domein
1. Project Settings → Domains → Add `simulatie.enervia.be`
2. Bij je DNS provider: A-record `simulatie` → `76.76.21.21`
3. Vercel handelt SSL automatisch af

### Cron
`vercel.json` bevat al:
- `/api/cron/cleanup` elke dag om 03:00 (GDPR)
- `/api/cron/energieprijzen` elke dag om 06:00

Zet env var `CRON_SECRET` (random 32 bytes):
```bash
openssl rand -base64 32
```

## 3. Worker process (VEKA verificatie)

VEKA-scraping via Playwright werkt niet goed binnen Vercel's serverless
constraints. Deploy het worker-proces apart:

### Optie A: Railway
```bash
npm i -g @railway/cli
railway init
railway up
# voeg REDIS_URL en SUPABASE keys toe als env vars
# start command: npm run worker
```

### Optie B: Fly.io
Zie `fly.toml` (nog toe te voegen); run command `tsx scripts/worker.ts`.

### Optie C: Skip VEKA verificatie
Zet `VEKA_VERIFICATION_DISABLED=true` in Vercel env. Dossiers worden dan
niet automatisch geverifieerd tegen VEKA's officiële simulator.

## 4. Eerste admin

Na eerste login (via `@enervia.be` Google account), promote jezelf via
Supabase SQL editor:

```sql
update public.users set rol = 'admin' where email = 'info@enervia.be';
```

## 5. Post-deploy checks

- [ ] `https://simulatie.enervia.be/sign-in` toont Enervia-branded login
- [ ] Google SSO werkt; non-enervia.be accounts worden geweigerd
- [ ] `/dashboard` laadt na login
- [ ] `/dashboard/nieuw` → PDF upload werkt
- [ ] Extract-endpoint `/api/dossiers/[id]/extract` geeft Claude-output terug
- [ ] Klantportal via `/klant/{token}` laadt zonder login
- [ ] `/dashboard/instellingen` toont actuele energieprijzen
- [ ] Cron-test: `curl -H "Authorization: Bearer $CRON_SECRET" https://simulatie.enervia.be/api/cron/energieprijzen`

## 6. Monitoring

### Sentry (aanbevolen)
```bash
npx @sentry/wizard@latest -i nextjs
```
Voegt automatisch alle error tracking toe. `SENTRY_DSN` naar Vercel env.

### Logs
- Vercel Dashboard → Functions → Logs
- Supabase Dashboard → Logs
- Upstash Dashboard → Metrics (queue depth)

## Rollback

Vercel houdt elke deploy bij. Previous deployment → Promote to Production
in één klik.
