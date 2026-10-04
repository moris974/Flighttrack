# FlightTrack (nome provvisorio)

App di tracciamento voli con funzionalità equivalenti a byAir: ricerca/tracciamento volo,
stato in tempo reale, ritardi, gate/terminal, itinerari multi-tratta. Stack: Next.js 14 +
Supabase, dati voli via AeroDataBox.

## Setup

1. Crea un progetto su supabase.com, copia URL/anon key/service role key in `.env.local`
   (parti da `.env.example`).
2. Applica la migration in `supabase/migrations/0001_init.sql` (SQL Editor su Supabase,
   oppure `supabase db push` con la CLI).
3. Crea un account su RapidAPI e sottoscrivi AeroDataBox, copia la chiave in
   `AERODATABOX_API_KEY`.
4. Per l'import via email: configura un provider di posta in ingresso (Mailgun Routes,
   Postmark Inbound, o SendGrid Inbound Parse) su un sottodominio (es.
   `mail.tuodominio.com`), puntando il webhook a `/api/import/email` con l'header
   `x-import-secret` impostato al valore di `EMAIL_IMPORT_SECRET`. Aggiorna
   `IMPORT_DOMAIN` in `app/settings/page.jsx` con il tuo dominio reale.
5. Per le notifiche automatiche: imposta `CRON_SECRET` e, se deployi su Vercel, il file
   `vercel.json` già configura una chiamata a `/api/cron/refresh-flights` ogni 15 minuti
   (Vercel la autentica da solo con `Authorization: Bearer $CRON_SECRET`). Su altri hosting
   serve un cron esterno che chiami quell'endpoint con lo stesso header.
6. L'import da calendario non richiede setup aggiuntivo lato server: ogni utente incolla il
   proprio link ICS in Impostazioni, e `vercel.json` chiama `/api/cron/refresh-calendars`
   una volta al giorno (stesso `CRON_SECRET`).
7. Per il banner live (notifiche push Android/desktop) servono le chiavi VAPID: genera una
   coppia con `npx web-push generate-vapid-keys` e imposta `VAPID_PUBLIC_KEY` /
   `VAPID_PRIVATE_KEY` (server) e `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (client, stessa chiave
   pubblica). Su iOS Safari le notifiche push richiedono che l'app sia installata su home
   screen (limite della piattaforma, non dell'app).
8. `npm install`
9. `npm run dev`

## Cosa c'è già
- Schema DB: profili (con slug per import email), aeroporti, itinerari, voli, notifiche,
  candidati di import (con RLS per utente)
- Wrapper provider dati voli (`lib/flightProvider.js`) — livello di astrazione, così si può
  cambiare provider senza toccare il resto dell'app
- API route `/api/flights/search` — cerca il volo e lo salva per l'utente autenticato
- Login/registrazione (email+password e Google OAuth), middleware di protezione route
- Pagina Home: form ricerca + creazione/selezione itinerario + voli raggruppati per viaggio
- Pagina dettaglio volo: orari, gate, ritardo, aeromobile, mappa percorso (OpenStreetMap)
- Import automatico via email inoltrata: webhook che riconosce numero volo/data dal testo
  (`lib/emailParser.js`), pagina "Voli da confermare" per validare prima del tracciamento,
  pagina Impostazioni con l'indirizzo email personale da usare per l'inoltro
- Notifiche automatiche su cambio stato/gate: trigger SQL che genera la notifica quando un
  volo cambia stato o gate, endpoint cron che aggiorna periodicamente i voli attivi dal
  provider dati, campanello notifiche in tempo reale nella NavBar
- Guida aeroportuale nel dettaglio volo: meteo attuale (Open-Meteo) e link rapidi per
  indicazioni/taxi/parcheggi verso l'aeroporto
- Condivisione stato volo: link pubblico senza login, condivisione diretta su
  WhatsApp/Telegram
- Import automatico da calendario: l'utente incolla il proprio link ICS in Impostazioni, un
  cron giornaliero (`/api/cron/refresh-calendars`) legge gli eventi e propone i voli
  riconosciuti in "Voli da confermare", con lo stesso parser usato per le email
- Banner live via notifiche push: pulsante "Attiva banner live" nel dettaglio volo, service
  worker (`public/sw.js`) che riceve le push anche ad app chiusa, countdown alla partenza e
  ritardo aggiornati dal cron (stesso "tag" = la notifica si aggiorna invece di accumularsi)

## App Android (TWA)
L'app Android incapsula la web app in una Trusted Web Activity: stessa base di codice,
niente app separata da mantenere, ma installabile e pubblicabile su Play Store.

1. **Prerequisito**: la web app deve essere online su un dominio HTTPS reale (es. Vercel),
   con `manifest.json` e le icone raggiungibili pubblicamente.
2. Installa Bubblewrap: `npm i -g @bubblewrap/cli` (richiede Java JDK 8+ e Android SDK, che
   Bubblewrap può scaricare da solo al primo avvio).
3. Genera il progetto Android:
   `bubblewrap init --manifest=https://TUODOMINIO/manifest.json`
   — oppure aggiorna i placeholder in `twa-manifest.json` con il tuo dominio reale e lancia
   `bubblewrap init` puntando a quel file.
4. Compila: `bubblewrap build` — genera sia un `.apk` (per test diretti) sia un `.aab`
   (per la pubblicazione su Play Store).
5. Bubblewrap stampa l'impronta SHA256 della chiave di firma generata: copiala in
   `public/.well-known/assetlinks.json` al posto del placeholder, poi rideploya la web app
   (questo file deve essere raggiungibile pubblicamente per far sparire la barra del
   browser dall'app Android).
6. Installa l'`.apk` su un telefono Android per testare, oppure carica l'`.aab` su Google
   Play Console (canale "Test interno") per condividerla senza pubblicarla subito.

## Stato
Tutte le funzionalità pianificate sono state implementate. Prossimi passi possibili:
rifinitura UI, test end-to-end con dati reali, deploy.
