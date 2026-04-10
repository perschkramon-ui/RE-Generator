import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import type { Request, Response } from 'express';
import Stripe from 'stripe';

interface StripeLineItem {
  price_data: {
    currency: string;
    product_data: { name: string };
    unit_amount: number;
  };
  quantity: number;
}

// Secrets — einmalig setzen:
//   firebase functions:secrets:set BREVO_API_KEY
//   firebase functions:secrets:set STRIPE_SECRET_KEY
//   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
const BREVO_SECRET = defineSecret('BREVO_API_KEY');
const STRIPE_SECRET = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

admin.initializeApp();
const db = admin.firestore();

// ─────────────────────────────────────────────────────────────────────────────
// Brevo email helper
// ─────────────────────────────────────────────────────────────────────────────

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

async function sendBrevoEmail(params: {
  apiKey: string;
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  senderName: string;
  senderEmail: string;
  attachments?: { name: string; content: string }[];
}) {
  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': params.apiKey,
    },
    body: JSON.stringify({
      sender: { name: params.senderName, email: params.senderEmail },
      to: params.to,
      subject: params.subject,
      htmlContent: params.htmlContent,
      attachment: params.attachments,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo error: ${err}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Callable: sendInvoiceEmail
// ─────────────────────────────────────────────────────────────────────────────

interface SendInvoiceRequest {
  uid: string;
  invoiceId: string;
  pdfBase64?: string;
}

export const sendInvoiceEmail = onCall<SendInvoiceRequest>(
  { region: 'europe-west1', secrets: [BREVO_SECRET] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Login erforderlich.');

    const { uid, invoiceId, pdfBase64 } = req.data;
    const brevoApiKey = BREVO_SECRET.value();
    if (!brevoApiKey) throw new HttpsError('failed-precondition', 'Brevo API-Schlüssel nicht konfiguriert.');

    // Load invoice + company settings from Firestore
    const [invSnap, compSnap] = await Promise.all([
      db.doc(`users/${uid}/invoices/${invoiceId}`).get(),
      db.doc(`users/${uid}/settings/company`).get(),
    ]);

    if (!invSnap.exists) throw new HttpsError('not-found', 'Rechnung nicht gefunden.');
    if (!compSnap.exists) throw new HttpsError('not-found', 'Firmeneinstellungen fehlen.');

    const inv = invSnap.data() as Record<string, unknown>;
    const company = compSnap.data() as Record<string, unknown>;

    const customerEmail = (inv.customer as Record<string, string>)?.email;
    const customerName = (inv.customer as Record<string, string>)?.name;
    const invoiceNumber = inv.invoiceNumber as string;
    const dueDate = inv.dueDate as string;

    if (!customerEmail) throw new HttpsError('invalid-argument', 'Kunde hat keine E-Mail-Adresse.');

    const htmlContent = `
      <p>Sehr geehrte/r ${customerName},</p>
      <p>anbei erhalten Sie Rechnung <strong>${invoiceNumber}</strong>.</p>
      <p>Zahlungsziel: <strong>${dueDate}</strong></p>
      <br>
      <p>Mit freundlichen Grüßen<br>${company.name}</p>
    `;

    const attachments = pdfBase64
      ? [{ name: `Rechnung-${invoiceNumber}.pdf`, content: pdfBase64 }]
      : undefined;

    await sendBrevoEmail({
      apiKey: brevoApiKey,
      to: [{ email: customerEmail, name: customerName }],
      subject: `Rechnung ${invoiceNumber} von ${company.name}`,
      htmlContent,
      senderName: company.name as string,
      senderEmail: company.email as string,
      attachments,
    });

    // Update invoice status to 'sent'
    await db.doc(`users/${uid}/invoices/${invoiceId}`).update({ status: 'sent' });

    return { success: true };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Callable: sendReminderEmail
// ─────────────────────────────────────────────────────────────────────────────

interface SendReminderRequest {
  uid: string;
  invoiceId: string;
}

export const sendReminderEmail = onCall<SendReminderRequest>(
  { region: 'europe-west1', secrets: [BREVO_SECRET] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Login erforderlich.');

    const { uid, invoiceId } = req.data;
    const brevoApiKey = BREVO_SECRET.value();
    if (!brevoApiKey) throw new HttpsError('failed-precondition', 'Brevo API-Schlüssel nicht konfiguriert.');

    const [invSnap, compSnap] = await Promise.all([
      db.doc(`users/${uid}/invoices/${invoiceId}`).get(),
      db.doc(`users/${uid}/settings/company`).get(),
    ]);
    if (!invSnap.exists) throw new HttpsError('not-found', 'Rechnung nicht gefunden.');

    const inv = invSnap.data() as Record<string, unknown>;
    const company = compSnap.data() as Record<string, unknown>;

    const customer = inv.customer as Record<string, string>;
    if (!customer?.email) throw new HttpsError('invalid-argument', 'Keine E-Mail-Adresse.');

    const today = new Date();
    const due = new Date(inv.dueDate as string);
    const diffDays = Math.floor((today.getTime() - due.getTime()) / 86_400_000);

    const htmlContent = `
      <p>Sehr geehrte/r ${customer.name},</p>
      <p>wir erlauben uns, Sie an folgende offene Rechnung zu erinnern:</p>
      <table>
        <tr><td>Rechnungsnummer:</td><td><strong>${inv.invoiceNumber}</strong></td></tr>
        <tr><td>Fälligkeitsdatum:</td><td>${inv.dueDate}</td></tr>
        ${diffDays > 0 ? `<tr><td>Überfällig seit:</td><td><strong>${diffDays} Tagen</strong></td></tr>` : ''}
      </table>
      <br>
      <p>Bankverbindung:<br>
      ${company.bankName ? `Bank: ${company.bankName}<br>` : ''}
      ${company.iban ? `IBAN: ${company.iban}<br>` : ''}
      ${company.bic ? `BIC: ${company.bic}` : ''}
      </p>
      <br>
      <p>Mit freundlichen Grüßen<br>${company.name}</p>
    `;

    await sendBrevoEmail({
      apiKey: brevoApiKey,
      to: [{ email: customer.email, name: customer.name }],
      subject: `Zahlungserinnerung – Rechnung ${inv.invoiceNumber} (${company.name})`,
      htmlContent,
      senderName: company.name as string,
      senderEmail: company.email as string,
    });

    const today2 = new Date().toISOString().slice(0, 10);
    await db.doc(`users/${uid}/invoices/${invoiceId}`).update({ reminderSentAt: today2 });

    return { success: true };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Callable: createStripeCheckout
// Creates a Stripe Checkout session for an invoice and returns the URL.
// Supports: card, SEPA debit, Sofortüberweisung (klarna), PayPal (if enabled)
// ─────────────────────────────────────────────────────────────────────────────

interface CreateCheckoutRequest {
  uid: string;
  invoiceId: string;
}

export const createStripeCheckout = onCall<CreateCheckoutRequest>(
  { region: 'europe-west1', secrets: [STRIPE_SECRET] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Login erforderlich.');

    const { uid, invoiceId } = req.data;
    const stripe = new Stripe(STRIPE_SECRET.value());

    const [invSnap, compSnap] = await Promise.all([
      db.doc(`users/${uid}/invoices/${invoiceId}`).get(),
      db.doc(`users/${uid}/settings/company`).get(),
    ]);
    if (!invSnap.exists) throw new HttpsError('not-found', 'Rechnung nicht gefunden.');

    const inv = invSnap.data() as Record<string, unknown>;
    const company = compSnap.data() as Record<string, unknown>;
    const items = inv.items as Array<{ description: string; quantity: number; unitPrice: number; vatRate: number }>;
    const isSmall = (company.smallBusiness as boolean) ?? false;

    // Build Stripe line items
    const lineItems: StripeLineItem[] = items.map((item) => {
      const net = item.unitPrice * 100; // cents
      const gross = isSmall ? net : Math.round(net * (1 + item.vatRate / 100));
      return {
        price_data: {
          currency: 'eur',
          product_data: { name: item.description },
          unit_amount: gross,
        },
        quantity: item.quantity,
      };
    });

    // Build success/cancel URLs pointing back to the app
    const appUrl = (company.website as string) || 'https://re-generator-f1de5.web.app';
    const successUrl = `${appUrl}?payment=success&invoice=${invoiceId}`;
    const cancelUrl  = `${appUrl}?payment=cancelled&invoice=${invoiceId}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      currency: 'eur',
      payment_method_types: ['card', 'sepa_debit', 'sofort', 'klarna'],
      customer_email: (inv.customer as Record<string, string>)?.email || undefined,
      metadata: { uid, invoiceId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Store session ID in Firestore so webhook can match it
    await db.doc(`users/${uid}/invoices/${invoiceId}`).update({
      stripeSessionId: session.id,
      stripeCheckoutUrl: session.url,
    });

    return { url: session.url, sessionId: session.id };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Callable: sendTeamInvite — sends a Brevo invitation email to a new team member
// ─────────────────────────────────────────────────────────────────────────────

interface SendInviteRequest {
  toEmail: string;
  inviterName: string;
  companyName: string;
  role: string;
  appUrl: string;
}

export const sendTeamInvite = onCall<SendInviteRequest>(
  { region: 'europe-west1', secrets: [BREVO_SECRET] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Login erforderlich.');
    const { toEmail, inviterName, companyName, role, appUrl } = req.data;

    const roleLabels: Record<string, string> = {
      admin: 'Administrator',
      accountant: 'Buchhalter',
      viewer: 'Betrachter',
    };

    const htmlContent = `
      <p>Hallo,</p>
      <p><strong>${inviterName}</strong> hat dich als <strong>${roleLabels[role] ?? role}</strong> 
      zum Rechnungsgenerator-Account von <strong>${companyName}</strong> eingeladen.</p>
      <p>Registriere dich mit dieser E-Mail-Adresse unter:</p>
      <p><a href="${appUrl}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin:12px 0">
        Einladung annehmen
      </a></p>
      <p style="color:#6b7280;font-size:12px">
        Nach der Registrierung mit dieser E-Mail-Adresse hast du automatisch Zugriff auf das Konto.
      </p>
    `;

    await sendBrevoEmail({
      apiKey: BREVO_SECRET.value(),
      to: [{ email: toEmail }],
      subject: `Einladung: ${companyName} – Rechnungsgenerator`,
      htmlContent,
      senderName: companyName,
      senderEmail: req.data.appUrl.includes('localhost') ? 'noreply@example.com' : 'noreply@re-generator-f1de5.web.app',
    });

    return { success: true };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// HTTP: stripeWebhook
// Stripe calls this endpoint when a payment completes → marks invoice as paid
// Set in Stripe Dashboard: Webhooks → Add endpoint → event: checkout.session.completed
// ─────────────────────────────────────────────────────────────────────────────

export const stripeWebhook = onRequest(
  { region: 'europe-west1', secrets: [STRIPE_SECRET, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const stripe = new Stripe(STRIPE_SECRET.value());

    let event: ReturnType<typeof stripe.webhooks.constructEvent>;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (err) {
      res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { metadata?: Record<string,string>; payment_status?: string; };
      const { uid, invoiceId } = session.metadata ?? {};
      if (uid && invoiceId && session.payment_status === 'paid') {
        const today = new Date().toISOString().slice(0, 10);
        await db.doc(`users/${uid}/invoices/${invoiceId}`).update({
          status: 'paid',
          paidAt: today,
          paymentMethod: 'stripe',
        });
        console.log(`Invoice ${invoiceId} marked as paid via Stripe.`);
      }
    }

    res.json({ received: true });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled: generateRecurringInvoices (täglich 06:00 Europe/Berlin)
// ─────────────────────────────────────────────────────────────────────────────

export const generateRecurringInvoices = onSchedule(
  { schedule: '0 6 * * *', timeZone: 'Europe/Berlin', region: 'europe-west1', secrets: [BREVO_SECRET] },
  async () => {
    const today = new Date().toISOString().slice(0, 10);
    const usersSnap = await db.collection('users').listDocuments();

    for (const userRef of usersSnap) {
      const uid = userRef.id;
      const compSnap = await db.doc(`${userRef.path}/settings/company`).get();
      if (!compSnap.exists) continue;

      const company = compSnap.data() as {
        invoicePrefix: string;
        numberFormat: string;
        numberPadding: number;
        nextInvoiceNumber: number;
        defaultPaymentDays: number;
        aiApiKey?: string;
      };

      const recurringSnap = await db.collection(`${userRef.path}/recurring`).get();
      const batch = db.batch();
      let nextNum = company.nextInvoiceNumber;
      let generated = 0;

      for (const rDoc of recurringSnap.docs) {
        const r = rDoc.data() as {
          active: boolean;
          nextDate: string;
          interval: string;
          dayOfMonth: number;
          customer: Record<string, unknown>;
          items: unknown[];
          notes?: string;
        };
        if (!r.active || r.nextDate > today) continue;

        // Build invoice number
        const padded = String(nextNum).padStart(company.numberPadding ?? 4, '0');
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const invNum = (company.numberFormat ?? '{PREFIX}-{YEAR}-{NUM}')
          .replace('{PREFIX}', company.invoicePrefix ?? 'RE')
          .replace('{YEAR}', String(year))
          .replace('{MONTH}', month)
          .replace('{NUM}', padded);
        nextNum++;

        // Calculate due date
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + (company.defaultPaymentDays ?? 14));
        const dueDateStr = dueDate.toISOString().slice(0, 10);

        // New invoice document
        const invRef = db.collection(`${userRef.path}/invoices`).doc();
        batch.set(invRef, {
          id: invRef.id,
          invoiceNumber: invNum,
          date: today,
          serviceDate: today,
          dueDate: dueDateStr,
          customer: r.customer,
          items: (r.items as Array<Record<string, unknown>>).map((it) => ({ ...it, id: db.collection('_').doc().id })),
          notes: r.notes,
          status: 'draft',
          createdAt: new Date().toISOString(),
        });

        // Advance nextDate
        const nextDate = advanceDateByInterval(r.nextDate, r.interval, r.dayOfMonth);
        batch.update(rDoc.ref, { lastGeneratedAt: today, nextDate });
        generated++;
      }

      if (generated > 0) {
        batch.update(db.doc(`${userRef.path}/settings/company`), { nextInvoiceNumber: nextNum });
        await batch.commit();
        console.log(`[${uid}] Generated ${generated} recurring invoice(s).`);
      }
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled: autoDunning — checks all invoices daily and sends reminders
// ─────────────────────────────────────────────────────────────────────────────

export const autoDunning = onSchedule(
  { schedule: '30 6 * * *', timeZone: 'Europe/Berlin', region: 'europe-west1', secrets: [BREVO_SECRET] },
  async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const usersSnap = await db.collection('users').listDocuments();

    for (const userRef of usersSnap) {
      const uid = userRef.id;
      const compSnap = await db.doc(`${userRef.path}/settings/company`).get();
      if (!compSnap.exists) continue;

      const company = compSnap.data() as {
        name: string;
        email: string;
        iban?: string;
        bic?: string;
        bankName?: string;
        smallBusiness?: boolean;
        dunningAutoSend?: boolean;
        dunningLevels?: Array<{ level: number; triggerAfterDays: number; fee: number; interestRatePercent: number; label: string }>;
        brevoApiKey?: string;
      };

      if (!company.dunningAutoSend) continue;
      const levels = company.dunningLevels ?? [];

      const invoicesSnap = await db.collection(`${userRef.path}/invoices`)
        .where('status', 'in', ['sent'])
        .get();

      for (const invDoc of invoicesSnap.docs) {
        const inv = invDoc.data() as {
          dueDate: string;
          dunningLevel?: number;
          dunningHistory?: unknown[];
          customer: { email?: string; name?: string };
          invoiceNumber: string;
          date: string;
          items: Array<{ quantity: number; unitPrice: number; vatRate: number }>;
        };

        const due = new Date(inv.dueDate);
        due.setHours(0, 0, 0, 0);
        const daysLate = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
        if (daysLate <= 0) continue;

        const currentLevel = inv.dunningLevel ?? 0;
        const nextLevel = levels
          .filter((l) => l.level > currentLevel && l.triggerAfterDays <= daysLate)
          .sort((a, b) => a.level - b.level)[0];

        if (!nextLevel) continue;
        if (!inv.customer.email) continue;

        // Calculate gross
        const net = inv.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
        const gross = company.smallBusiness
          ? net
          : net + inv.items.reduce((s, it) => s + it.quantity * it.unitPrice * (it.vatRate / 100), 0);
        const interest = (gross * (nextLevel.interestRatePercent / 100) * daysLate) / 365;
        const totalDue = gross + nextLevel.fee + interest;

        const fmt = (n: number) =>
          new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

        const htmlContent = `
          <p>Sehr geehrte/r ${inv.customer.name},</p>
          <p>trotz unserer vorherigen Erinnerung ist folgende Rechnung noch offen:</p>
          <table>
            <tr><td>Rechnungsnummer:</td><td><strong>${inv.invoiceNumber}</strong></td></tr>
            <tr><td>Fälligkeitsdatum:</td><td>${inv.dueDate}</td></tr>
            <tr><td>Offener Betrag:</td><td>${fmt(gross)}</td></tr>
            ${nextLevel.fee > 0 ? `<tr><td>Mahngebühr:</td><td>${fmt(nextLevel.fee)}</td></tr>` : ''}
            ${interest > 0 ? `<tr><td>Verzugszinsen (${nextLevel.interestRatePercent}% p.a.):</td><td>${fmt(interest)}</td></tr>` : ''}
            ${nextLevel.fee > 0 || interest > 0 ? `<tr><td><strong>Gesamtbetrag:</strong></td><td><strong>${fmt(totalDue)}</strong></td></tr>` : ''}
          </table>
          <p>${company.iban ? `IBAN: ${company.iban}` : ''} ${company.bic ? `· BIC: ${company.bic}` : ''}</p>
          <p>Mit freundlichen Grüßen<br>${company.name}</p>
        `;

        try {
          await sendBrevoEmail({
            apiKey: BREVO_SECRET.value(),
            to: [{ email: inv.customer.email, name: inv.customer.name }],
            subject: `${nextLevel.label} – Rechnung ${inv.invoiceNumber} (${company.name})`,
            htmlContent,
            senderName: company.name,
            senderEmail: company.email,
          });

          const entry = { level: nextLevel.level, sentAt: todayStr, fee: nextLevel.fee, method: 'email' };
          await invDoc.ref.update({
            dunningLevel: nextLevel.level,
            reminderSentAt: todayStr,
            dunningHistory: [...(inv.dunningHistory ?? []), entry],
          });
          console.log(`[${uid}] Dunning level ${nextLevel.level} sent for ${inv.invoiceNumber}`);
        } catch (e) {
          console.error(`[${uid}] Failed to send dunning for ${inv.invoiceNumber}:`, e);
        }
      }
    }
  }
);

function advanceDateByInterval(isoDate: string, interval: string, dayOfMonth = 1): string {
  const d = new Date(isoDate);
  switch (interval) {
    case 'weekly':  d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1);
                    d.setDate(Math.min(dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3);
                      d.setDate(Math.min(dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); break;
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().slice(0, 10);
}

// ═════════════════════════════════════════════════════════════════════════════
//  REST API  —  Base URL: https://europe-west1-re-generator-f1de5.cloudfunctions.net/api/v1
//
//  Authentication: Authorization: Bearer <api_key>
//
//  Endpoints:
//    GET    /invoices              list invoices
//    GET    /invoices/:id          get one invoice
//    POST   /invoices              create invoice
//    PATCH  /invoices/:id/status   update status
//    GET    /customers             list customers
//    GET    /customers/:id         get one customer
//    POST   /customers             create customer
//    GET    /products              list products
//    GET    /health                API health check
// ═════════════════════════════════════════════════════════════════════════════

// ── API key helper ────────────────────────────────────────────────────────────

function hashKey(plainKey: string): string {
  return crypto.createHash('sha256').update(plainKey).digest('hex');
}

interface ApiKeyDoc {
  keyHash: string;
  scopes: string[];
  active: boolean;
  ownerUid: string;
}

/**
 * Validates Bearer token against stored hashed keys.
 * Returns { uid, scopes } or null if invalid.
 */
async function authenticateApiKey(
  authHeader: string | undefined
): Promise<{ uid: string; scopes: string[] } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const plainKey = authHeader.slice(7).trim();
  if (!plainKey.startsWith('rgk_')) return null;

  const hash = hashKey(plainKey);

  // Search all users' apiKeys collections
  const usersSnap = await db.collection('users').listDocuments();
  for (const userRef of usersSnap) {
    const keysSnap = await db.collection(`${userRef.path}/apiKeys`)
      .where('keyHash', '==', hash)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (!keysSnap.empty) {
      const keyDoc = keysSnap.docs[0].data() as ApiKeyDoc;
      // Update lastUsedAt (non-blocking)
      keysSnap.docs[0].ref.update({ lastUsedAt: new Date().toISOString() }).catch(() => {});
      return { uid: userRef.id, scopes: keyDoc.scopes };
    }
  }
  return null;
}

function requireScope(scopes: string[], scope: string, res: Response): boolean {
  if (!scopes.includes(scope)) {
    res.status(403).json({ error: 'Insufficient scope', required: scope });
    return false;
  }
  return true;
}

function cors(res: Response) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization,Content-Type');
}

// ── Route handler ──────────────────────────────────────────────────────────────

async function handleApi(req: Request, res: Response) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  const auth = await authenticateApiKey(req.headers.authorization);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized. Provide a valid API key as: Authorization: Bearer rgk_...' });
    return;
  }
  const { uid, scopes } = auth;
  const base = `/users/${uid}`;

  // Parse path: strip /api/v1 prefix
  const rawPath = req.path.replace(/^\/api\/v1/, '').replace(/\/$/, '') || '/';
  const [, resource, id, action] = rawPath.split('/');

  // ── GET /health ──
  if (rawPath === '/health' || rawPath === '/') {
    res.json({ status: 'ok', version: '1.0', uid });
    return;
  }

  // ── Invoices ──
  if (resource === 'invoices') {
    if (!id) {
      // GET /invoices
      if (req.method === 'GET') {
        if (!requireScope(scopes, 'invoices:read', res)) return;
        const snap = await db.collection(`${base}/invoices`).orderBy('date', 'desc').limit(100).get();
        res.json({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
      }
      // POST /invoices
      else if (req.method === 'POST') {
        if (!requireScope(scopes, 'invoices:write', res)) return;
        const body = req.body as Record<string, unknown>;
        if (!body.invoiceNumber || !body.customer || !body.items) {
          res.status(400).json({ error: 'Missing required fields: invoiceNumber, customer, items' });
          return;
        }
        const docRef = db.collection(`${base}/invoices`).doc();
        const invoice = { ...body, id: docRef.id, createdAt: new Date().toISOString(), status: body.status ?? 'draft' };
        await docRef.set(invoice);
        res.status(201).json({ data: invoice });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
      return;
    }

    if (!action) {
      // GET /invoices/:id
      if (req.method === 'GET') {
        if (!requireScope(scopes, 'invoices:read', res)) return;
        const snap = await db.doc(`${base}/invoices/${id}`).get();
        if (!snap.exists) { res.status(404).json({ error: 'Invoice not found' }); return; }
        res.json({ data: { id: snap.id, ...snap.data() } });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
      return;
    }

    // PATCH /invoices/:id/status
    if (action === 'status' && req.method === 'PATCH') {
      if (!requireScope(scopes, 'invoices:write', res)) return;
      const { status } = req.body as { status: string };
      const valid = ['draft', 'sent', 'paid', 'cancelled'];
      if (!valid.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
        return;
      }
      const update: Record<string, string> = { status };
      if (status === 'paid') update.paidAt = new Date().toISOString().slice(0, 10);
      await db.doc(`${base}/invoices/${id}`).update(update);
      res.json({ data: { id, ...update } });
      return;
    }
  }

  // ── Customers ──
  if (resource === 'customers') {
    if (!id) {
      if (req.method === 'GET') {
        if (!requireScope(scopes, 'customers:read', res)) return;
        const snap = await db.collection(`${base}/customers`).limit(200).get();
        res.json({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
      } else if (req.method === 'POST') {
        if (!requireScope(scopes, 'customers:write', res)) return;
        const body = req.body as Record<string, unknown>;
        if (!body.name) { res.status(400).json({ error: 'Missing required field: name' }); return; }
        const docRef = db.collection(`${base}/customers`).doc();
        const customer = { ...body, id: docRef.id };
        await docRef.set(customer);
        res.status(201).json({ data: customer });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
      return;
    }
    if (req.method === 'GET') {
      if (!requireScope(scopes, 'customers:read', res)) return;
      const snap = await db.doc(`${base}/customers/${id}`).get();
      if (!snap.exists) { res.status(404).json({ error: 'Customer not found' }); return; }
      res.json({ data: { id: snap.id, ...snap.data() } });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    return;
  }

  // ── Products ──
  if (resource === 'products') {
    if (!requireScope(scopes, 'products:read', res)) return;
    if (!id) {
      const snap = await db.collection(`${base}/products`).limit(200).get();
      res.json({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    } else {
      const snap = await db.doc(`${base}/products/${id}`).get();
      if (!snap.exists) { res.status(404).json({ error: 'Product not found' }); return; }
      res.json({ data: { id: snap.id, ...snap.data() } });
    }
    return;
  }

  res.status(404).json({ error: `Unknown resource: ${resource}` });
}

export const api = onRequest(
  { region: 'europe-west1', cors: false },
  (req, res) => handleApi(req, res).catch((err) => {
    console.error('API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  })
);

// ── Callable: createApiKey — generates a key, stores hash, returns plain key once ──

interface CreateApiKeyRequest {
  uid: string;
  name: string;
  scopes: string[];
  expiresAt?: string;
}

export const createApiKey = onCall<CreateApiKeyRequest>(
  { region: 'europe-west1' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Login erforderlich.');

    const { uid, name, scopes, expiresAt } = req.data;

    // Generate cryptographically random key: rgk_<32 hex chars>
    const plainKey = 'rgk_' + crypto.randomBytes(24).toString('hex');
    const keyHash = hashKey(plainKey);
    const keyPrefix = plainKey.slice(0, 8);
    const id = crypto.randomUUID();

    await db.doc(`users/${uid}/apiKeys/${id}`).set({
      id,
      name,
      keyHash,
      keyPrefix,
      scopes,
      active: true,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt ?? null,
      ownerUid: uid,
    });

    // Return plain key — shown ONCE, never stored in plain text
    return { id, plainKey, keyPrefix, scopes };
  }
);

// ── Callable: revokeApiKey ────────────────────────────────────────────────────

export const revokeApiKey = onCall<{ uid: string; keyId: string }>(
  { region: 'europe-west1' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Login erforderlich.');
    await db.doc(`users/${req.data.uid}/apiKeys/${req.data.keyId}`).update({ active: false });
    return { success: true };
  }
);
