"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRecurringInvoices = exports.sendReminderEmail = exports.sendInvoiceEmail = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
// Secret: einmalig setzen mit:
//   firebase secrets:set BREVO_API_KEY
const BREVO_SECRET = (0, params_1.defineSecret)('BREVO_API_KEY');
admin.initializeApp();
const db = admin.firestore();
// ─────────────────────────────────────────────────────────────────────────────
// Brevo email helper
// ─────────────────────────────────────────────────────────────────────────────
const BREVO_API = 'https://api.brevo.com/v3/smtp/email';
async function sendBrevoEmail(params) {
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
exports.sendInvoiceEmail = (0, https_1.onCall)({ region: 'europe-west1', secrets: [BREVO_SECRET] }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError('unauthenticated', 'Login erforderlich.');
    const { uid, invoiceId, pdfBase64 } = req.data;
    const brevoApiKey = BREVO_SECRET.value();
    if (!brevoApiKey)
        throw new https_1.HttpsError('failed-precondition', 'Brevo API-Schlüssel nicht konfiguriert.');
    // Load invoice + company settings from Firestore
    const [invSnap, compSnap] = await Promise.all([
        db.doc(`users/${uid}/invoices/${invoiceId}`).get(),
        db.doc(`users/${uid}/settings/company`).get(),
    ]);
    if (!invSnap.exists)
        throw new https_1.HttpsError('not-found', 'Rechnung nicht gefunden.');
    if (!compSnap.exists)
        throw new https_1.HttpsError('not-found', 'Firmeneinstellungen fehlen.');
    const inv = invSnap.data();
    const company = compSnap.data();
    const customerEmail = inv.customer?.email;
    const customerName = inv.customer?.name;
    const invoiceNumber = inv.invoiceNumber;
    const dueDate = inv.dueDate;
    if (!customerEmail)
        throw new https_1.HttpsError('invalid-argument', 'Kunde hat keine E-Mail-Adresse.');
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
        senderName: company.name,
        senderEmail: company.email,
        attachments,
    });
    // Update invoice status to 'sent'
    await db.doc(`users/${uid}/invoices/${invoiceId}`).update({ status: 'sent' });
    return { success: true };
});
exports.sendReminderEmail = (0, https_1.onCall)({ region: 'europe-west1', secrets: [BREVO_SECRET] }, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError('unauthenticated', 'Login erforderlich.');
    const { uid, invoiceId } = req.data;
    const brevoApiKey = BREVO_SECRET.value();
    if (!brevoApiKey)
        throw new https_1.HttpsError('failed-precondition', 'Brevo API-Schlüssel nicht konfiguriert.');
    const [invSnap, compSnap] = await Promise.all([
        db.doc(`users/${uid}/invoices/${invoiceId}`).get(),
        db.doc(`users/${uid}/settings/company`).get(),
    ]);
    if (!invSnap.exists)
        throw new https_1.HttpsError('not-found', 'Rechnung nicht gefunden.');
    const inv = invSnap.data();
    const company = compSnap.data();
    const customer = inv.customer;
    if (!customer?.email)
        throw new https_1.HttpsError('invalid-argument', 'Keine E-Mail-Adresse.');
    const today = new Date();
    const due = new Date(inv.dueDate);
    const diffDays = Math.floor((today.getTime() - due.getTime()) / 86400000);
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
        senderName: company.name,
        senderEmail: company.email,
    });
    const today2 = new Date().toISOString().slice(0, 10);
    await db.doc(`users/${uid}/invoices/${invoiceId}`).update({ reminderSentAt: today2 });
    return { success: true };
});
// ─────────────────────────────────────────────────────────────────────────────
// Scheduled: generateRecurringInvoices (täglich 06:00 Europe/Berlin)
// ─────────────────────────────────────────────────────────────────────────────
exports.generateRecurringInvoices = (0, scheduler_1.onSchedule)({ schedule: '0 6 * * *', timeZone: 'Europe/Berlin', region: 'europe-west1', secrets: [BREVO_SECRET] }, async () => {
    const today = new Date().toISOString().slice(0, 10);
    const usersSnap = await db.collection('users').listDocuments();
    for (const userRef of usersSnap) {
        const uid = userRef.id;
        const compSnap = await db.doc(`${userRef.path}/settings/company`).get();
        if (!compSnap.exists)
            continue;
        const company = compSnap.data();
        const recurringSnap = await db.collection(`${userRef.path}/recurring`).get();
        const batch = db.batch();
        let nextNum = company.nextInvoiceNumber;
        let generated = 0;
        for (const rDoc of recurringSnap.docs) {
            const r = rDoc.data();
            if (!r.active || r.nextDate > today)
                continue;
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
                items: r.items.map((it) => ({ ...it, id: db.collection('_').doc().id })),
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
});
function advanceDateByInterval(isoDate, interval, dayOfMonth = 1) {
    const d = new Date(isoDate);
    switch (interval) {
        case 'weekly':
            d.setDate(d.getDate() + 7);
            break;
        case 'monthly':
            d.setMonth(d.getMonth() + 1);
            d.setDate(Math.min(dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
            break;
        case 'quarterly':
            d.setMonth(d.getMonth() + 3);
            d.setDate(Math.min(dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
            break;
        case 'yearly':
            d.setFullYear(d.getFullYear() + 1);
            break;
    }
    return d.toISOString().slice(0, 10);
}
//# sourceMappingURL=index.js.map