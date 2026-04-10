import type { CompanySettings, Invoice } from '../types';
import {
  calcInvoiceTotals,
  formatCurrency,
  formatDate,
} from '../utils/invoiceUtils';

interface Props {
  invoice: Invoice;
  company: CompanySettings;
}

/** Hex → rgba with opacity */
function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function InvoicePreview({ invoice, company }: Props) {
  const totals = calcInvoiceTotals(invoice.items);
  const isSmallBusiness = company.smallBusiness;
  const brand = company.brandColor || '#1d4ed8';
  const accent = company.accentColor || '#1e40af';

  return (
    <div
      id="invoice-preview"
      style={{ fontFamily: 'system-ui, Arial, sans-serif' }}
      className="bg-white max-w-3xl mx-auto text-gray-800 text-sm"
    >
      {/* ── Brand header bar ──────────────────────────────────────────── */}
      <div style={{ backgroundColor: brand, height: 6 }} />

      <div className="px-10 pt-8 pb-10">
        {/* ── Top: Logo + Company info + Invoice title ─────────────────── */}
        <div className="flex justify-between items-start mb-10 gap-6">
          {/* Left: Logo + sender */}
          <div className="max-w-xs">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt="Logo" style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain', marginBottom: 12 }} />
            ) : (
              <p style={{ color: brand, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{company.name}</p>
            )}
            <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.7 }}>
              {company.logoUrl && <p style={{ fontWeight: 600, color: '#111827' }}>{company.name}</p>}
              <p>{company.street}</p>
              <p>{company.zip} {company.city}, {company.country}</p>
              {company.email && <p>{company.email}</p>}
              {company.phone && <p>{company.phone}</p>}
              {company.website && <p>{company.website}</p>}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid #e5e7eb` }}>
                <p>Steuernummer: {company.taxNumber}</p>
                {company.vatId && <p>USt-IdNr.: {company.vatId}</p>}
              </div>
            </div>
          </div>

          {/* Right: Invoice title + meta */}
          <div style={{ textAlign: 'right', minWidth: 220 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: brand, marginBottom: 16, letterSpacing: -0.5 }}>
              RECHNUNG
            </h1>
            <table style={{ marginLeft: 'auto', fontSize: 11, borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: 'Rechnungsnummer', value: invoice.invoiceNumber, bold: true },
                  { label: 'Rechnungsdatum', value: formatDate(invoice.date) },
                  {
                    label: 'Leistungsdatum',
                    value: formatDate(invoice.serviceDate) + (invoice.serviceDateEnd ? ` – ${formatDate(invoice.serviceDateEnd)}` : ''),
                  },
                  { label: 'Fällig am', value: formatDate(invoice.dueDate), bold: true },
                ].map(({ label, value, bold }) => (
                  <tr key={label}>
                    <td style={{ paddingRight: 12, color: '#9ca3af', paddingBottom: 2 }}>{label}</td>
                    <td style={{ fontWeight: bold ? 700 : 400, color: bold ? '#111827' : '#374151', paddingBottom: 2 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Recipient box ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Rechnungsempfänger
          </p>
          <div
            style={{
              borderLeft: `3px solid ${brand}`,
              paddingLeft: 12,
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            {invoice.customer.company && (
              <p style={{ fontWeight: 600 }}>{invoice.customer.company}</p>
            )}
            <p style={{ fontWeight: invoice.customer.company ? 400 : 600 }}>{invoice.customer.name}</p>
            <p style={{ color: '#4b5563' }}>{invoice.customer.street}</p>
            <p style={{ color: '#4b5563' }}>{invoice.customer.zip} {invoice.customer.city}</p>
            <p style={{ color: '#4b5563' }}>{invoice.customer.country}</p>
            {invoice.customer.taxId && (
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>USt-IdNr.: {invoice.customer.taxId}</p>
            )}
          </div>
        </div>

        {/* ── Line items table ─────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: brand, color: '#fff' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, borderRadius: '4px 0 0 4px' }}>Beschreibung</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, width: 60 }}>Menge</th>
              <th style={{ padding: '8px 6px', fontWeight: 600, width: 60 }}>Einh.</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, width: 90 }}>Einzelpr.</th>
              {!isSmallBusiness && (
                <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, width: 60 }}>MwSt.</th>
              )}
              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, width: 90, borderRadius: '0 4px 4px 0' }}>Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => {
              const net = item.quantity * item.unitPrice;
              const gross = isSmallBusiness ? net : net * (1 + item.vatRate / 100);
              const bg = i % 2 === 0 ? hexToRgba(brand, 0.04) : '#fff';
              return (
                <tr key={item.id} style={{ backgroundColor: bg }}>
                  <td style={{ padding: '9px 10px', verticalAlign: 'top' }}>{item.description}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '9px 6px', color: '#6b7280' }}>{item.unit}</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                  {!isSmallBusiness && (
                    <td style={{ padding: '9px 10px', textAlign: 'right', color: '#6b7280' }}>{item.vatRate} %</td>
                  )}
                  <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(gross)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Totals ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
          <div style={{ minWidth: 260 }}>
            {!isSmallBusiness && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#6b7280' }}>
                  <span>Nettobetrag</span>
                  <span>{formatCurrency(totals.net)}</span>
                </div>
                {Object.entries(totals.vatAmounts)
                  .filter(([, v]) => v > 0)
                  .map(([rate, amount]) => (
                    <div key={rate} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#6b7280' }}>
                      <span>MwSt. {rate} %</span>
                      <span>{formatCurrency(amount)}</span>
                    </div>
                  ))}
              </div>
            )}
            {/* Gesamtbetrag box */}
            <div
              style={{
                backgroundColor: accent,
                color: '#fff',
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>Gesamtbetrag</span>
              <span style={{ fontWeight: 800, fontSize: 20 }}>
                {formatCurrency(isSmallBusiness ? totals.net : totals.gross)}
              </span>
            </div>
          </div>
        </div>

        {/* ── §19 UStG notice ──────────────────────────────────────────── */}
        {isSmallBusiness && (
          <div style={{ border: '1px solid #fcd34d', backgroundColor: '#fffbeb', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
            Gemäß §19 UStG wird keine Umsatzsteuer berechnet.
          </div>
        )}

        {/* ── Payment info ─────────────────────────────────────────────── */}
        {(company.iban || company.bankName || company.paymentNotes) && (
          <div style={{ borderTop: `2px solid ${brand}`, paddingTop: 16, marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 12, color: '#111827', marginBottom: 6 }}>Bankverbindung / Zahlung</p>
            <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.8 }}>
              {company.bankName && <p>Bank: {company.bankName}</p>}
              {company.iban && <p>IBAN: <span style={{ fontFamily: 'monospace' }}>{company.iban}</span></p>}
              {company.bic && <p>BIC: {company.bic}</p>}
              {company.paymentNotes && <p style={{ marginTop: 4 }}>{company.paymentNotes}</p>}
            </div>
          </div>
        )}

        {/* ── Notes ────────────────────────────────────────────────────── */}
        {invoice.notes && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, fontSize: 12, color: '#6b7280', whiteSpace: 'pre-wrap' }}>
            {invoice.notes}
          </div>
        )}

        {/* ── Footer bar ───────────────────────────────────────────────── */}
        <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af' }}>
          <span>{company.name} &middot; {company.street} &middot; {company.zip} {company.city}</span>
          <span>{invoice.invoiceNumber}</span>
        </div>
      </div>

      {/* ── Bottom brand bar ─────────────────────────────────────────── */}
      <div style={{ backgroundColor: brand, height: 4 }} />
    </div>
  );
}
