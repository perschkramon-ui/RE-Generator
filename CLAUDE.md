# CLAUDE.md – RE-Generator (PWA-Rechnungsgenerator für Freelancer, DE/AT/CH)

Projektgedächtnis: Ist-Zustand, Landkarte, Fallstricke und Arbeitsregeln, damit
keine Session den Bestand neu ergründen muss.

> Angelegt am 2026-07-29. Alle Angaben sind aus dem Repo-Inhalt (Quellcode,
> Konfiguration, Git-Historie, GitHub-API) abgeleitet und **nicht am laufenden
> System verifiziert** — kein Firebase-, Stripe- oder Brevo-Zugriff geprüft.

## Globale Regeln zuerst lesen (gilt für JEDE Session, besonders Cloud/Handy)

Die projektübergreifenden Regeln (Token-Policy, Gedächtnis-Pflicht,
**Fehlerklassen mit Guards**) stehen NICHT hier, sondern im Master-Repo
`https://github.com/perschkramon-ui/claude-global` — alleinige Quelle.

- **Lokale Sessions** (PC/Laptop) bekommen sie automatisch über einen
  SessionStart-Hook nach `~/.claude/CLAUDE.md`. Nichts zu tun.
- **Cloud-Sessions** (auch vom Smartphone über claude.ai/code) sehen kein
  PC-Dateisystem und bekommen sie NUR über diesen Weg — beim Onboarding
  zusätzlich zu diesem Repo holen und als globale Regeln lesen:
  ```bash
  gh repo clone perschkramon-ui/claude-global
  ```
  Ohne diesen Schritt arbeitet die Session ohne die Fehlerklassen-Guards.

## Was das ist

PWA-Rechnungsgenerator für Freelancer und kleine Unternehmen im
deutschsprachigen Raum (DE/AT/CH). Im Code „RE Generator – Rechnungsgenerator",
package name `rechnungsgenerator`.

Funktionsumfang laut Quellcode:

- Rechnungen und Angebote inkl. PDF- und CSV-Export
- Kunden-, Produkt- und Materialverwaltung
- wiederkehrende Rechnungen, konfigurierbares Mahnsystem
- Mehr-Profil-/Teamverwaltung mit Rollen
- Stripe-Zahlung und -Abo
- eigene REST-API mit API-Keys
- KI-Funktionen über OpenAI (Leistungsbeschreibungen generieren,
  Rechnungsentwurf aus Freitext) und Belegscanner per OCR

**Wichtig:** Die `README.md` ist das unveränderte Vite-React-Template und
beschreibt das Projekt NICHT. Der Zweck ist aus `index.html` (Meta/Title),
`vite.config.ts` (PWA-Manifest) und dem Komponenten-/Functions-Code belegt.

**Stack**

- Frontend: React 19.2, TypeScript ~6.0.2, Vite ^8.0.4, Tailwind CSS 4
  (`@tailwindcss/vite`), zustand ^5 (State), react-hook-form ^7.72 + zod ^4
  (+ `@hookform/resolvers`), date-fns ^4, jspdf ^4.2 + html2canvas ^1.4
  (PDF-Export), tesseract.js ^7 (OCR/Belegscanner), vite-plugin-pwa ^1.2 +
  workbox-window ^7.4 (PWA/Service Worker), ESLint 9 + typescript-eslint 8
- Backend: Firebase — Auth, Firestore, Cloud Functions v2 (Runtime `nodejs22`,
  Region `europe-west1`), Hosting. Functions-Deps: firebase-admin ^13.8,
  firebase-functions ^7.2, stripe ^22.0, `@sentry/node` ^10.48
- Externe Dienste: OpenAI Chat Completions (direkt per `fetch` aus dem Browser,
  Default-Modell `gpt-4o-mini`, `src/utils/aiService.ts`), Brevo
  (`https://api.brevo.com/v3/smtp/email`, Mailversand aus den Functions),
  Stripe (Checkout, Subscriptions, zwei Webhooks)

**Cloud Functions** — 13 Exports in `functions/src/index.ts` (990 Zeilen):
`sendInvoiceEmail`, `sendReminderEmail`, `createStripeCheckout`,
`sendTeamInvite`, `stripeWebhook`, `generateRecurringInvoices` (onSchedule),
`autoDunning` (onSchedule), `api` (onRequest, öffentliche REST-API),
`createSubscriptionCheckout`, `createCustomerPortalSession`,
`stripeSubscriptionWebhook`, `createApiKey`, `revokeApiKey`.

**Repo-Eckdaten:** Default-Branch `main` (einziger Branch), erstellt
2026-04-10, letzter Push 2026-06-20, 407 KB diskUsage, Primärsprache
TypeScript (432 KB TS, 185 KB JS). Keine Tags, keine Releases, keine offenen
PRs, keine Issues. Laut GitHub-API ist das Repo **public** (`isPrivate: false`).

## Landkarte — wo ist was

| Bereich | Ort |
| --- | --- |
| App-Einstieg | `index.html` → `src/main.tsx` → `src/App.tsx` (in `AuthProvider` gewrappt) |
| UI-Komponenten (27 Stück) | `src/components/` — u. a. `InvoiceForm`/`InvoiceList`/`InvoicePreview`, `LineItemsEditor`, `CustomerForm`/`CustomerList`, `ProductForm`/`ProductList`, `MaterialStock`, `RecurringList`, `DunningPanel`, `TeamManager`, `ApiKeyManager`, `PricingPage`, `PaymentButtons`, `AIWizard`, `AIDescriptionButton`, `ReceiptScanner`, `QuickInvoiceModal`, `IndustryCatalog`, `CompanySettings`, `ProfileManager`, `Login`, `InstallPrompt` |
| Globaler State | `src/store.ts` (zustand, 19 KB) — schreibt bei gesetzter `uid` direkt nach Firestore |
| Domänenmodell/Typen | `src/types.ts` (`CompanySettings`, `CompanyProfile`, `Invoice`, `Customer`, `Product`, `RecurringInvoice`, `TeamMember`/`TeamRole`, `ApiKey`, `Subscription`, `DunningLevel`) |
| Firestore-Zugriff | `src/services/firestoreService.ts` — Pfadschema `users/{uid}/…` (`profiles`, `settings/company`, `settings/activeProfile`, Sammlungen je Entität) |
| Firebase-Initialisierung | `src/firebase.ts` — Config aus `VITE_FIREBASE_*`, `getFunctions(app, 'europe-west1')` |
| Auth + Team-Kontext | `src/context/AuthContext.tsx` — ermittelt `ownerUid`/`teamRole` per `findOwnerUidForUser` |
| Hooks | `src/hooks/` — `useEmailSender.ts`, `usePayment.ts`, `usePermission.ts`, `useSubscription.ts` |
| Hilfsfunktionen | `src/utils/` — `aiService.ts` (OpenAI), `pdfExport.ts`, `csvExport.ts`, `invoiceUtils.ts` (Rechnungsnummern, Intervalle) |
| Branchen-Kataloge (Stammdaten) | `src/data/industryCatalogs.ts` (31 KB) |
| Cloud Functions | `functions/src/index.ts` (42 KB, 990 Zeilen), `functions/package.json`, `functions/tsconfig.json` |
| Firebase-Konfiguration | `firebase.json` (hosting/functions/firestore), `.firebaserc` (Projekt `re-generator-f1de5`), `firestore.rules`, `firestore.indexes.json` (leer) |
| CI/CD | `.github/workflows/firebase-deploy.yml` (einziger Workflow) |
| PWA/Icons | `vite.config.ts` (VitePWA-Manifest + runtimeCaching), `public/icons/` (icon-192/512 png+svg), `public/favicon.svg`, `public/apple-touch-icon.png`, `scripts/gen-icons.mjs`, `scripts/gen-png-icons.mjs`, `scripts/icons.cjs` |
| Eingecheckte Build-Artefakte | `dev-dist/` (`sw.js`, `workbox-f87553f6.js` 181 KB) und `functions/lib/` (`index.js` + `index.js.map`) |
| Toter Code | `App.tsx` im Repo-Root (alter 3-Tab-Stand, nicht vom Build erfasst) |

## Deploy & Betrieb

**Hosting:** Firebase Hosting, Projekt `re-generator-f1de5` (`.firebaserc`,
`projects.default`). `firebase.json`: `public = "dist"`, SPA-Rewrite
`**` → `/index.html`, `Cache-Control max-age=31536000` für
`**/*.@(js|css|woff2)`.

**Functions:** `source = "functions"`, `runtime = "nodejs22"`; Region im Code
`europe-west1` (`functions/src/index.ts` und `src/firebase.ts`
`getFunctions(app, 'europe-west1')`).

**Firestore:** `rules = firestore.rules` (nur Eigentümer-Zugriff auf
`users/{userId}/**`), `indexes = firestore.indexes.json` (leer).

**CI:** `.github/workflows/firebase-deploy.yml`, einziger Workflow, Trigger
Push auf `main`. Schritte: `actions/checkout@v4`, `actions/setup-node@v4`
(node-version 20, npm-Cache), `npm ci`, `npm run build` (mit den
`VITE_FIREBASE_*`-Secrets als env), dann `npx firebase-tools deploy --only
hosting --project re-generator-f1de5 --token <FIREBASE_TOKEN>
--non-interactive`. Deployt **ausschließlich Hosting** — Cloud Functions und
Firestore-Rules werden von der CI NICHT ausgerollt. Beide bisherigen Läufe sind
fehlgeschlagen. Nebenbefunde: `setup-node` zieht Node 20, das laut Runner-Log
bereits deprecated ist und auf Node 24 gezwungen wird; `--token` ist bei
aktuellen firebase-tools-Versionen ein Auslaufmodell.

**Secret-NAMEN (keine Werte, gehören hier auch nie hinein):**

- Vom Workflow erwartet: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
  `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `FIREBASE_TOKEN`
- Tatsächlich im Repo vorhandenes Actions-Secret: nur `RE_GENERATOR`
  (angelegt 2026-04-14). Keine Environments, keine Variables.
- Functions-Secrets über `defineSecret` (Firebase Secret Manager):
  `BREVO_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — die
  Setz-Anleitung steht als Kommentar direkt darüber
  (`firebase functions:secrets:set <NAME>`).
- Frontend-Env: die sechs `VITE_FIREBASE_*`-Variablen aus `src/firebase.ts`;
  eine `.env.example` existiert nicht.

Im Repo wurden **keine Secret-Werte** gefunden. Der einzige Treffer eines
Key-Musters ist ein Eingabefeld-Placeholder `"xkeysib-…"` in
`src/components/CompanySettings.tsx:379` — kein echter Schlüssel.

## Stand der Arbeit

**Zwischenstand, ausdrücklich als Backup abgelegt — nicht abgeschlossen.**

Gesamte Historie: 5 Commits.

| Commit | Datum | Nachricht |
| --- | --- | --- |
| `1a7f1d1` | 2026-04-10 | `.` |
| `e5a4fdc` | 2026-04-10 | feat: initial commit – vollständiger Rechnungsgenerator mit Firebase, Brevo, Stripe, AI, Team, API |
| `9c28519` | 2026-04-13 | `.` |
| `9e85206` | 2026-04-14 | `.` |
| `2411738` | 2026-06-20 17:50 +0200 | Backup: lokalen Arbeitsstand sichern |

Letzter Commit `2411738` = 12 Dateien, +2068/−133 Zeilen. Neu:
`src/components/IndustryCatalog.tsx`, `src/components/MaterialStock.tsx`,
`src/components/QuickInvoiceModal.tsx`, `src/components/ReceiptScanner.tsx`,
`src/data/industryCatalogs.ts`. Geändert: `src/App.tsx`,
`src/components/LineItemsEditor.tsx`, `ProductForm.tsx`, `ProductList.tsx`,
`src/store.ts`, `src/types.ts` sowie das Build-Artefakt `dev-dist/sw.js`. Also
ein reiner Zwischenstands-Dump, keine abgeschlossene Feature-Lieferung.

**Deploy-Stand:** Beide bisherigen GitHub-Actions-Läufe sind fehlgeschlagen
(Run 24387286844 am 2026-04-14, Run 27876136343 am 2026-06-20, jeweils nach
ca. 15 s). Über CI wurde nie erfolgreich deployed. Zwischen 2026-04-14 und
2026-06-20 lagen gut zwei Monate ohne Push; seit 2026-06-20 keine Aktivität.

## Fallstrick-Register

Jeder Punkt ist eine Fehlerklasse mit Gegenmaßnahme — nicht nur die Einzelstelle
fixen.

### 1. `npm ci` bricht in der CI mit ERESOLVE ab (echter Peer-Konflikt)

Der CI-Deploy scheitert reproduzierbar schon an der Installation (Log Run
27876136343). Ursache: `package.json`/`-lock` führen vite `^8.0.4` (aufgelöst
8.0.8), `vite-plugin-pwa@1.2.0` verlangt aber peer vite
`"^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0"`. Lokal wurde offenbar mit
`--legacy-peer-deps`/`--force` installiert, deshalb fällt es nur in der CI auf.

**Guard:** vor jedem Push einmal `npm ci` (nicht `npm install`) lokal
durchlaufen lassen; entweder vite auf `^7` zurückziehen oder vite-plugin-pwa auf
eine vite-8-taugliche Version heben, bis `npm ci` sauber ist.

### 2. Der Workflow referenziert Secrets, die es im Repo nicht gibt

`firebase-deploy.yml` erwartet `VITE_FIREBASE_API_KEY`,
`VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
`VITE_FIREBASE_APP_ID` und `FIREBASE_TOKEN`. `gh secret list` zeigt als einziges
Actions-Secret `RE_GENERATOR`; es gibt weder Environments noch Variables. Selbst
nach Behebung des `npm ci`-Fehlers würde der Build mit leerer Firebase-Config
durchlaufen und eine funktionsunfähige App deployen.

**Guard:** Secret-Namen im Workflow immer gegen `gh secret list` abgleichen und
im Build-Schritt auf leere Pflichtwerte prüfen (fail fast), statt still eine
kaputte Bundle-Config zu bauen.

### 3. Veraltetes, trotz `.gitignore` weiterhin getracktes Function-Build-Artefakt

`functions/lib/` steht in `.gitignore`, `git ls-files -i -c` listet
`functions/lib/index.js` und `index.js.map` aber als getrackt. Der eingecheckte
Stand ist vom 2026-04-10 und enthält nur 3 Exports (`sendInvoiceEmail`,
`sendReminderEmail`, `generateRecurringInvoices`), während
`functions/src/index.ts` (zuletzt 2026-04-13) 13 Exports hat. Da `firebase.json`
KEINEN predeploy-Hook definiert und `functions/package.json` `main` auf
`lib/index.js` zeigt, würde ein `firebase deploy --only functions` den alten
Stand ohne Stripe-, Abo-, Team-, Dunning- und API-Funktionen ausrollen.

**Guard:** `git rm -r --cached functions/lib` und in `firebase.json` einen
predeploy-Hook (`npm --prefix functions run build`) eintragen, damit nie ein
handgepflegtes Build-Artefakt deployed werden kann.

### 4. `dev-dist/` ist eingecheckt und fehlt in `.gitignore`

`dev-dist/sw.js` und `dev-dist/workbox-f87553f6.js` (181 KB, zweitgrößte Datei
im Repo) sind getrackt, obwohl es der bei jedem `vite dev` neu erzeugte
PWA-Dev-Service-Worker ist. Der letzte Commit hat `dev-dist/sw.js` tatsächlich
wieder mitgeschleppt (steht im Diffstat).

**Guard:** `dev-dist` in `.gitignore` aufnehmen und per
`git rm -r --cached dev-dist` aus dem Index nehmen — sonst produziert jeder
Dev-Lauf Pseudo-Änderungen und Merge-Konflikte.

### 5. Toter Duplikat-Einstiegspunkt

Neben `src/App.tsx` existiert im Repo-Root ein zweites `App.tsx` — ein alter
Stand mit nur 3 Tabs (invoices/customers/settings), der auf `'./components/…'`
importiert, was es im Root gar nicht gibt. Er wird weder von `index.html` (lädt
`/src/main.tsx`) noch von `tsconfig.app.json` (`include: ["src"]`) erfasst, fällt
also im Build nie auf, führt bei Suche/Grep aber garantiert zum Bearbeiten der
falschen Datei.

**Guard:** Root-`App.tsx` löschen; generell keine Quelldateien außerhalb von
`src/` liegen lassen.

### 6. Die eingecheckten Firestore-Rules widersprechen dem Team-Feature

`src/App.tsx:53` setzt `const dataUid = ownerUid ?? user.uid`, Teammitglieder
lesen und schreiben also unter `users/{ownerUid}/…`, und
`src/context/AuthContext.tsx` ermittelt den `ownerUid` über einen eigenen Lookup.
`firestore.rules` erlaubt aber ausschließlich
`match /users/{userId}/{document=**} { allow read, write: if request.auth != null && request.auth.uid == userId; }`.
Mit diesen Rules kann kein Teammitglied auf die Daten des Owners zugreifen —
`TeamManager`, Rollen und `usePermission` laufen ins Leere.

**Guard:** Firestore-Rules gegen die tatsächlich verwendeten Zugriffspfade testen
(Emulator/Regeltests), bevor ein zugriffsabhängiges Feature als fertig gilt.

### 7. Nutzer-Schlüssel landen entgegen dem Code-Kommentar in Firestore

`src/types.ts:211` kommentiert `aiApiKey` als „OpenAI API-Schlüssel
(clientseitig, nur lokal gespeichert)". Tatsächlich gilt
`CompanyProfile extends CompanySettings` (`types.ts:181`), und `src/store.ts`
speichert Profile über `fs.saveProfile` → `setDoc(users/{uid}/profiles/{id})` —
der OpenAI-Key (`aiApiKey`) und der Brevo-Key (`brevoApiKey`) wandern also mit
ins Firestore-Dokument. Zusätzlich geht der OpenAI-Key direkt aus dem Browser an
`api.openai.com` (`src/utils/aiService.ts`).

**Guard:** entweder Keys serverseitig über Cloud Functions + Secret Manager
kapseln (wie es für `BREVO_API_KEY`/`STRIPE_SECRET_KEY` in den Functions bereits
gemacht wird) oder den Kommentar korrigieren — irreführende
Sicherheitskommentare sind gefährlicher als gar keine.

### 8. Konfiguration ist nirgends dokumentiert

`.gitignore` nimmt `.env.example` ausdrücklich von der Ignorierung aus
(`!.env.example`), eine solche Datei existiert im Repo aber nicht, und die README
ist das unveränderte Vite-Template. Die sechs `VITE_FIREBASE_*`-Variablen, die
der Build zwingend braucht, sind damit ausschließlich aus `src/firebase.ts` und
dem Workflow rekonstruierbar.

**Guard:** `.env.example` mit den reinen Variablennamen anlegen und die README
durch eine projektspezifische Setup-Beschreibung ersetzen, bevor das Projekt
wieder aufgenommen wird.

## Arbeitsregeln

- **Am echten Objekt verifizieren.** Zustand nachsehen statt annehmen — Build,
  Rules, Secrets und Deploy-Stand haben hier nachweislich auseinandergelegen.
- **Kleine, überprüfbare Schritte.** Eine Änderung, eine Prüfung, dann die
  nächste.
- **commit + push = Backup.** Arbeitsstände nicht nur lokal liegen lassen.
- **Secrets nie ins Repo, in den Chat oder ins Gedächtnis.** Nur Namen und
  Ablageort dokumentieren, niemals Werte.
- **Beim Committen Dateien explizit adden — KEIN `git add -A`.** Das Repo enthält
  Env-nahe Pfade und Build-Artefakte; pauschales Adden schleppt sie mit.
- **Gedächtnis-Pflege ist Teil jeder Aufgabe.** Neue Dateien, Entscheidungen und
  teuer gelernte Fehler sofort hier eintragen, nicht nachträglich.

## Offen / nicht verifiziert

- **Sichtbarkeit:** Die GitHub-API meldet `isPrivate: false` — das Repo ist
  öffentlich. Ob das beabsichtigt ist, lässt sich aus dem Repo nicht klären.
  Relevant, weil im Client-Code Firebase-Config-Variablen und die komplette
  Geschäftslogik offenliegen (echte Secret-Werte wurden allerdings keine
  gefunden).
- Ob unter dem Firebase-Projekt `re-generator-f1de5` überhaupt etwas live ist
  (Hosting-Stand, deployte Functions, gesetzte Secret-Werte für
  `BREVO_API_KEY`/`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`,
  Firestore-Rules-Stand in der Cloud) — nicht geprüft, dazu wäre Firebase-Zugriff
  nötig. Über CI wurde nie erfolgreich deployed; ein manuelles lokales Deploy ist
  aber nicht auszuschließen, insbesondere für die Functions.
- Ob es auf dem PC einen lokalen Arbeitsstand gibt, der über den Backup-Commit
  `2411738` hinausgeht — es wurde ausschließlich das GitHub-Repo erhoben, kein
  lokales Arbeitsverzeichnis gesucht.
- Wozu das einzige vorhandene Actions-Secret `RE_GENERATOR` dient — der Name
  taucht in keinem Workflow und in keiner Datei des Repos auf.
- Ob `npm run build` (`tsc -b && vite build`) aktuell lokal fehlerfrei
  durchläuft — nicht ausgeführt. Angesichts des ungelösten
  vite/vite-plugin-pwa-Peer-Konflikts und strenger tsconfig-Optionen
  (`noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`) ist das offen.
- Ob die im Code verwendeten OpenAI-Modelle (Default `gpt-4o-mini` in
  `src/utils/aiService.ts`, zusätzlich ein konfigurierbares `aiModel`-Feld) noch
  verfügbar sind — nicht gegen die OpenAI-API geprüft.
- Ob die im letzten Commit neu hinzugekommenen Features (`MaterialStock`,
  `ReceiptScanner`/OCR, `QuickInvoiceModal`, `IndustryCatalog`) funktional fertig
  oder halbfertig sind — dazu gibt es weder Tests im Repo (keinerlei Testdateien
  oder Test-Skripte gefunden) noch eine Commit-Beschreibung außer „Backup:
  lokalen Arbeitsstand sichern".
