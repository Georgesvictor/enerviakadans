# Admin-handleiding (Giljom)

## Rollen

- **Verkoper** (default): ziet eigen dossiers, kan simuleren en delen
- **Admin** (jij): ziet alle dossiers, kan settings/energieprijzen
  aanpassen, en audit log raadplegen

Nieuwe verkopers worden admin door:
```sql
update public.users set rol = 'admin' where email = 'jouw@enervia.be';
```
(Via Supabase SQL editor.)

## Instellingen bijhouden

Ga naar `/dashboard/instellingen`. Je kan aanpassen:

### Commerciële rente
Standaard rentevoet voor commerciële lening (wanneer klant niet in
aanmerking komt voor MijnVerbouwLening). Verkopers kunnen dit per
dossier aanpassen met slider. Standaard = 3.5%.

### COP warmtepomp
Coefficient of Performance voor lucht-water WP. Conservatief op 3.2
gezet (Vaillant aroTHERM haalt 3.5-4.0 in praktijk). Hoger COP =
hogere berekende besparing.

### Jaarlijkse prijsstijging
Voor 10-jaar projectie. Default 3%. Bij extreme energiepiek kan je
tijdelijk verhogen.

### Inkomensdrempels
Pas aan bij elke jaarlijkse update van MijnVerbouwPremie regelgeving.
VEKA publiceert dit begin januari.

**Belangrijk**: wijzigingen gelden enkel voor **nieuwe** dossiers.
Oude dossiers behouden hun snapshot van parameters bij PDF-generatie.

## Energieprijzen

De lijst toont de 10 meest recente prijzen. Bronnen:
- **VREG**: elektriciteit + terugleververgoeding (auto 06:00)
- **CREG**: aardgas (auto 06:00)
- **manueel**: stookolie of jouw overrides

Als automatische scrape faalt, tonen we de laatste gekende waarde.

## Audit log

Alle kritische acties worden gelogd in tabel `public.audit_log`:
- Dossier create/update/delete
- PDF generatie (bank vs klant)
- Klantportal view (met IP)
- Settings wijzigingen
- GDPR auto-cleanup

Query via Supabase:
```sql
select created_at, actie, user_id, metadata
from public.audit_log
order by created_at desc
limit 100;
```

## GDPR auto-delete

Dossiers verdwijnen 90 dagen na aanmaken. Cron draait om 03:00 elke
dag. Je ontvangt optioneel een maandelijks overzicht (toekomstige feature).

**Handmatige cleanup** (bv. op vraag van klant):
```sql
delete from public.dossiers where id = 'xxx';
```
Cascade-deletes alles (extracties, parameters, premies, lening,
besparing, pdfs, audit).

## Cost monitoring

**Claude kosten per dossier** (Sonnet 4.6):
- Extractie: ~3000 input tokens × $3/M + ~1500 output × $15/M ≈ $0.03
- Validator (Haiku): ~5000 input × $0.25/M + ~300 output × $1.25/M ≈ $0.002
- **Totaal per dossier: ~$0.035**

100 dossiers/maand ≈ $3.50 Claude kosten.

## Troubleshooting

### "Extractie faalde"
1. Check Anthropic dashboard of er API-quota is
2. Check dat PDF daadwerkelijk text bevat (geen scan-only image PDF)
3. Klik "Opnieuw extracteren" — Claude is stochastisch

### "Teamleader verbinding verloren"
1. Check `/dashboard/teamleader` — status
2. Klik "Opnieuw koppelen"
3. Als token niet refreshbaar: check Teamleader Developer Portal of app nog actief is

### "VEKA verificatie status = fout"
Playwright scraper werkt niet binnen Vercel Serverless. Nodige:
- Deploy `scripts/worker.ts` als aparte service (Railway/Fly.io)
- Of: zet `VEKA_VERIFICATION_DISABLED=true` om deze stap over te slaan

### Dossier blijft in status "draft"
Betekent dat extractie nog niet gelukt is. Ga naar dossier detail →
tab "Extractie" → klik "Start extractie".

## Backup strategy

Supabase automatische backups (7 dagen). Voor extra veiligheid:
- Settings → Database → Enable Point-in-Time Recovery
- Wekelijks manueel export van PDFs uit `dossiers` storage bucket

## Contact voor issues

Tech issues → raadpleeg Claude Code via het project zelf, of:
- Sentry dashboard voor errors
- Vercel logs voor function invocaties
- Supabase logs voor DB queries
