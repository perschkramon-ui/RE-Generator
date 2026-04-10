import type { CompanySettings, Invoice } from '../types';
import { calcInvoiceTotals, formatDate } from './invoiceUtils';

// ── helpers ──────────────────────────────────────────────────────────────────

function escCsv(v: string | number | undefined): string {
  const s = String(v ?? '');
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(...cols: (string | number | undefined)[]): string {
  return cols.map(escCsv).join(';') + '\r\n';
}

function downloadBlob(content: string, filename: string, mime = 'text/csv;charset=utf-8;') {
  // BOM so Excel opens UTF-8 correctly
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Standard CSV Export ────────────────────────────────────────────────────

/**
 * Exports all invoices as a flat CSV with one row per line item.
 * Opens correctly in Excel and LibreOffice Calc.
 */
export function exportCsv(invoices: Invoice[], company: CompanySettings): void {
  const isSmall = company.smallBusiness;
  let content = row(
    'Rechnungsnummer',
    'Rechnungsdatum',
    'Leistungsdatum',
    'Fällig am',
    'Status',
    'Kunde Name',
    'Kunde Firma',
    'Kunde Straße',
    'Kunde PLZ',
    'Kunde Stadt',
    'Kunde Land',
    'Kunde USt-IdNr.',
    'Pos. Beschreibung',
    'Pos. Menge',
    'Pos. Einheit',
    'Pos. Einzelpreis netto',
    'Pos. MwSt. %',
    'Pos. MwSt. Betrag',
    'Pos. Gesamt brutto',
    'Rg. Netto gesamt',
    'Rg. MwSt. gesamt',
    'Rg. Brutto gesamt',
  );

  const sorted = [...invoices].sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));

  for (const inv of sorted) {
    const totals = calcInvoiceTotals(inv.items);
    const totalVat = Object.values(totals.vatAmounts).reduce((a, b) => a + b, 0);
    const gross = isSmall ? totals.net : totals.gross;

    for (const item of inv.items) {
      const lineNet = item.quantity * item.unitPrice;
      const lineVat = isSmall ? 0 : lineNet * (item.vatRate / 100);
      const lineGross = lineNet + lineVat;

      content += row(
        inv.invoiceNumber,
        formatDate(inv.date),
        formatDate(inv.serviceDate) + (inv.serviceDateEnd ? ` – ${formatDate(inv.serviceDateEnd)}` : ''),
        formatDate(inv.dueDate),
        inv.status,
        inv.customer.name,
        inv.customer.company,
        inv.customer.street,
        inv.customer.zip,
        inv.customer.city,
        inv.customer.country,
        inv.customer.taxId,
        item.description,
        item.quantity,
        item.unit,
        lineNet.toFixed(2),
        isSmall ? 0 : item.vatRate,
        lineVat.toFixed(2),
        lineGross.toFixed(2),
        totals.net.toFixed(2),
        isSmall ? '0.00' : totalVat.toFixed(2),
        gross.toFixed(2),
      );
    }
  }

  downloadBlob(content, `Rechnungen-Export-${new Date().getFullYear()}.csv`);
}

// ── DATEV Export ──────────────────────────────────────────────────────────────
/**
 * Generates a DATEV Buchungsstapel CSV (Buchungsstapel-Format 1.0).
 * Compatible with DATEV Unternehmen Online and most tax accountant software.
 *
 * Spec reference: DATEV-Programmbeschreibung "DATEV-Format CSV" (Buchungsdaten)
 *
 * Erlöskonten (SKR03):
 *   8400 – Erlöse 19% MwSt.
 *   8300 – Erlöse 7% MwSt.
 *   8120 – Steuerfreie Erlöse (§19 UStG / 0%)
 *
 * Debitorenkonto: Kundennummer als 3-stellige Nummer (10000 + Index), Gegenkonto 1200 (Bank)
 */
export function exportDatev(invoices: Invoice[], company: CompanySettings): void {
  const year = new Date().getFullYear();
  const isSmall = company.smallBusiness;

  // ── Header (DATEV Buchungsstapel Kopfdatensatz) ──────────────────────────
  const headerLine =
    '"EXTF";700;21;"Buchungsstapel";1;' + // Kennzeichen, Versionsnummer, Formatkategorie, Formatname, Formatversion
    `"${toDatevDate(new Date())}";` + // Erzeugt am
    '"";"";"";"";' +                  // Importiert, Herkunft, Exportiert, Überprüft
    `"${company.name.slice(0, 25)}";` + // Beraternummer-Ersatz: Firmenname
    `"";` +                           // Beraterkennzeichen
    `"${year}0101";"${year}1231";` +  // Wirtschaftsjahresbeginn/-ende (Feld nicht normiert hier)
    `"${year}";` +                    // Wirtschaftsjahr
    '"";' +                           // Sachkontonummernlänge
    '"";' +                           // Datum von
    '"";' +                           // Datum bis
    '"Rechnungsgenerator-Export";"";"";"";1;"";""' +
    '\r\n';

  // ── Column headers ────────────────────────────────────────────────────────
  const colHeader = row(
    'Umsatz (ohne Soll/Haben-Kz)',
    'Soll/Haben-Kennzeichen',
    'WKZ Umsatz',
    'Kurs',
    'Basis-Umsatz',
    'WKZ Basis-Umsatz',
    'Konto',
    'Gegenkonto (ohne BU-Schlüssel)',
    'BU-Schlüssel',
    'Belegdatum',
    'Belegfeld 1',
    'Belegfeld 2',
    'Skonto',
    'Buchungstext',
    'Postensperre',
    'Diverse Adressnummer',
    'Geschäftspartnerbank',
    'Sachverhalt',
    'Zinssperre',
    'Beleglink',
    'Beleginfo-Art 1',
    'Beleginfo-Inhalt 1',
    'Beleginfo-Art 2',
    'Beleginfo-Inhalt 2',
  );

  // ── Data rows ─────────────────────────────────────────────────────────────
  let dataRows = '';
  const sorted = [...invoices]
    .filter((inv) => inv.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const inv of sorted) {
    const isSmallInv = isSmall;

    // Group by VAT rate → one booking row per VAT rate
    const vatGroups: Record<number, number> = {};
    for (const item of inv.items) {
      const net = item.quantity * item.unitPrice;
      vatGroups[item.vatRate] = (vatGroups[item.vatRate] ?? 0) + net;
    }

    for (const [vatRateStr, netAmount] of Object.entries(vatGroups)) {
      const vatRate = Number(vatRateStr);
      const gross = isSmallInv ? netAmount : netAmount * (1 + vatRate / 100);

      // Erlöskonto SKR03
      let erloeskonto: string;
      if (isSmallInv || vatRate === 0) {
        erloeskonto = '8120'; // Steuerfreie Erlöse / Kleinunternehmer
      } else if (vatRate === 7) {
        erloeskonto = '8300'; // 7% MwSt.
      } else {
        erloeskonto = '8400'; // 19% MwSt.
      }

      // BU-Schlüssel (Steuerschlüssel)
      let buKey = '';
      if (!isSmallInv) {
        if (vatRate === 19) buKey = '';       // Normalfall — kein BU-Schlüssel nötig
        if (vatRate === 7) buKey = '90';      // 7% Erlöse
        if (vatRate === 0) buKey = '40';      // Steuerfreie Erlöse
      }

      // Debitorenkonto (4-stellig, Kunde als 10000+Index)
      const custIdx = sorted.findIndex((i) => i.customer.id === inv.customer.id) + 1;
      const debitKonto = String(10000 + custIdx);

      dataRows += row(
        gross.toFixed(2).replace('.', ','), // Umsatz mit Komma
        'S',                                 // Soll (wir buchen Forderung)
        'EUR',
        '',                                  // Kurs
        '',                                  // Basis-Umsatz
        '',                                  // WKZ Basis-Umsatz
        debitKonto,                          // Konto (Debitor)
        erloeskonto,                         // Gegenkonto (Erlös)
        buKey,                               // BU-Schlüssel
        toDatevDate(new Date(inv.date)),     // Belegdatum TTMM
        inv.invoiceNumber,                   // Belegfeld 1 (Rechnungsnummer)
        '',                                  // Belegfeld 2
        '',                                  // Skonto
        `${inv.customer.name.slice(0, 30)} ${vatRate}% MwSt.`, // Buchungstext
        '',                                  // Postensperre
        '',                                  // Diverse Adressnummer
        '',                                  // Geschäftspartnerbank
        '',                                  // Sachverhalt
        '',                                  // Zinssperre
        '',                                  // Beleglink
        'Leistungsdatum',
        formatDate(inv.serviceDate),
        'Fällig am',
        formatDate(inv.dueDate),
      );
    }
  }

  const content = headerLine + colHeader + dataRows;
  downloadBlob(content, `DATEV-Buchungsstapel-${year}.csv`);
}

/** DATEV date format: TTMM (für Belegdatum) */
function toDatevDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}${mm}`;
}
