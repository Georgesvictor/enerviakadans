# Verkoper-handleiding

## Een nieuw dossier maken in 6 stappen

### Stap 1 — Offerte opladen
- Ga naar `/dashboard/nieuw`
- Kies tussen:
  - **Upload PDF**: sleep de offerte-PDF (max 20 MB) in het vak, of klik om te selecteren
  - **Uit Teamleader**: selecteer een offerte uit je recente lijst (vereist eenmalige koppeling via `/dashboard/teamleader`)

### Stap 2 — Extractie reviewen
- Claude leest de PDF en extraheert automatisch alle posten
- Review de tabel — velden zoals dak m², warmtepomp type, asbest worden herkend
- Als de validator-score onder 80% zit: extra aandacht nodig — corrigeer of klik "Opnieuw extracteren"
- Klik "Goedkeuren en volgende" wanneer alles klopt

### Stap 3 — Klant &amp; woning
Vul in:
- **Inkomen + burgerlijke staat + ten laste** → bepaalt automatisch de inkomenscategorie (cat.1/2/3)
- **EPC label voor/verwacht** → bepaalt EPC-labelpremie
- **Woning ouderdom** (voor/na 2006) → bepaalt MijnVerbouwLening-geschiktheid
- **Eigenaar + gedomicilieerd + andere woning** → idem
- **Huidig verwarmingstype + jaarverbruik gas/elek/stookolie** → basis voor besparingsberekening

### Stap 4 — Premies
- Klik "Bereken premies"
- App toont per categorie: bedrag, formule en of het maximum bereikt is
- Totaal staat in groen onderaan
- Disclaimer onderaan blijft altijd staan

### Stap 5 — Lening
- Als klant geschikt is voor MijnVerbouwLening: kies dat voor 0% (cat.1) of 1% (cat.2) rente
- Anders: commerciële lening met instelbare rente (1-8%)
- Schuif **eigen inbreng**, **rente**, **looptijd** sliders → maandaflossing update live
- Klik "Opslaan en volgende"

### Stap 6 — Besparing
- App haalt actuele VREG/CREG prijzen op en berekent:
  - Jaarlijkse besparing warmtepomp + PV + batterij
  - 10-jaar projectie met grafiek
  - Terugverdientijd in jaren

### Afronden
- Na stap 6 → tab "Dossier"
- Toggle "Bank-focus" / "Klant-focus"
- **PDF downloaden**: klik → gegenereerde PDF opent in nieuwe tab
- **Klantlink genereren**: klik → URL wordt automatisch naar klembord gekopieerd → deel per email/Whatsapp

## Klant-portal

De klant opent `https://simulatie.enervia.be/klant/{token}` en kan:
- De simulatie bekijken (zelfde cijfers als in jouw dossier)
- Zelf sliders bewegen: eigen inbreng, rentevoet (bij commerciële lening), looptijd
- Grafiek van 10-jaar besparing interactief verkennen

De link is **30 dagen geldig**. Daarna moet je een nieuwe genereren.

## Teamleader koppeling

Eenmalig koppelen:
1. Ga naar `/dashboard/teamleader`
2. Klik "Koppel met Teamleader"
3. Log in bij Teamleader + autoriseer Enervia Simulatie
4. Je bent terug op de pagina met groene "Verbonden" badge

Je tokens worden automatisch ververst — je moet maar eens in de 2 maanden
opnieuw koppelen.

## Tips

- **Snelle check**: wil je snel weten of een klant in aanmerking komt
  voor MijnVerbouwLening? Doe stap 1-3 en kijk bij stap 5 of het tabblad
  groen staat.
- **Fixture dossier**: voor oefening, gebruik de Waumans 2026/1647 offerte
  die in Teamleader staat.
- **Auto-delete**: elk dossier wordt 90 dagen na aanmaken automatisch
  gewist (GDPR). Zie bovenaan het dossier wanneer het gaat verdwijnen.
- **Meerdere scenario's**: kloon desnoods een dossier voor een alternatieve
  simulatie (eigen inbreng 0 vs €20.000 bijvoorbeeld).
