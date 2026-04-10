import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';

// Secret: einmalig setzen mit:
//   firebase secrets:set BREVO_API_KEY
const BREVO_SECRET = defineSecret('BREVO_API_KEY');

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
