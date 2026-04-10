import type { Invoice, InvoiceTotals, LineItem, RecurringInterval } from '../types';

export function buildInvoiceNumber(
  prefix: string,
  num: number,
  format = '{PREFIX}-{YEAR}-{NUM}',
  padding = 4
): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const padded = String(num).padStart(padding, '0');
  return format
    .replace('{PREFIX}', prefix)
    .replace('{YEAR}', String(year))
    .replace('{MONTH}', month)
    .replace('{NUM}', padded);
}

export function calcLineTotals(item: LineItem) {
  const net = item.quantity * item.unitPrice;
  const vat = net * (item.vatRate / 100);
  const gross = net + vat;
  return { net, vat, gross };
}

export function calcInvoiceTotals(items: LineItem[]): InvoiceTotals {
  const vatAmounts: Record<number, number> = {};
  let net = 0;

  for (const item of items) {
    const lineNet = item.quantity * item.unitPrice;
    net += lineNet;
    const lineVat = lineNet * (item.vatRate / 100);
    vatAmounts[item.vatRate] = (vatAmounts[item.vatRate] ?? 0) + lineVat;
  }

  const gross = net + Object.values(vatAmounts).reduce((a, b) => a + b, 0);
  return { net, vatAmounts, gross };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  return new Intl.DateTimeFormat('de-DE').format(new Date(isoDate));
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function invoiceStatusLabel(status: Invoice['status'] | 'overdue'): string {
  const map: Record<Invoice['status'] | 'overdue', string> = {
    draft: 'Entwurf',
    sent: 'Versendet',
    paid: 'Bezahlt',
    cancelled: 'Storniert',
    overdue: 'Überfällig',
  };
  return map[status];
}

export function invoiceStatusColor(status: Invoice['status'] | 'overdue'): string {
  const map: Record<Invoice['status'] | 'overdue', string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    overdue: 'bg-red-100 text-red-700 ring-1 ring-red-400',
  };
  return map[status];
}

/** Returns 'overdue' when status is 'sent' and dueDate is in the past */
export function effectiveStatus(invoice: Invoice): Invoice['status'] | 'overdue' {
  if (invoice.status === 'sent' && invoice.dueDate < todayIso()) return 'overdue';
  return invoice.status;
}

/** Days overdue (negative = still open, positive = overdue) */
export function daysOverdue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000);
}

/** Advance an ISO date by one recurring interval */
export function advanceByInterval(isoDate: string, interval: RecurringInterval, dayOfMonth = 1): string {
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

export function recurringIntervalLabel(interval: RecurringInterval): string {
  const map: Record<RecurringInterval, string> = {
    weekly: 'Wöchentlich',
    monthly: 'Monatlich',
    quarterly: 'Quartalsweise',
    yearly: 'Jährlich',
  };
  return map[interval];
}

/** Builds a payment reminder text ready to paste into an email */
export function buildReminderText(invoice: Invoice, company: { name: string; email: string; iban?: string; bic?: string; bankName?: string }): string {
  const amount = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
    invoice.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0)
  );
  const days = daysOverdue(invoice.dueDate);
  return `Betreff: Zahlungserinnerung – Rechnung ${invoice.invoiceNumber}

Sehr geehrte Damen und Herren,

wir erlauben uns, Sie daran zu erinnern, dass folgende Rechnung noch offen ist:

  Rechnungsnummer: ${invoice.invoiceNumber}
  Rechnungsdatum:  ${formatDate(invoice.date)}
  Fälligkeitsdatum: ${formatDate(invoice.dueDate)}
  Offener Betrag:  ${amount}${days > 0 ? `\n  Überfällig seit:  ${days} ${days === 1 ? 'Tag' : 'Tagen'}` : ''}

Bitte überweisen Sie den ausstehenden Betrag auf folgendes Konto:
${company.bankName ? `  Bank: ${company.bankName}\n` : ''}${company.iban ? `  IBAN: ${company.iban}\n` : ''}${company.bic ? `  BIC:  ${company.bic}\n` : ''}
Sollte Ihre Zahlung bereits unterwegs sein, betrachten Sie dieses Schreiben als gegenstandslos.

Mit freundlichen Grüßen
${company.name}
${company.email}`;
}
