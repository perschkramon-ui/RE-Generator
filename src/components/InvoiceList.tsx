import { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import type { Invoice } from '../types';
import { InvoiceForm } from './InvoiceForm';
import { InvoicePreview } from './InvoicePreview';
import { PaymentButtons } from './PaymentButtons';
import { DunningPanel } from './DunningPanel';
import { Button } from './ui/Button';
import {
  formatCurrency,
  formatDate,
  calcInvoiceTotals,
  invoiceStatusColor,
  invoiceStatusLabel,
  effectiveStatus,
  daysOverdue,
  buildReminderText,
} from '../utils/invoiceUtils';
import { exportInvoicePdf } from '../utils/pdfExport';
import { exportCsv, exportDatev } from '../utils/csvExport';

type View = 'list' | 'create' | 'edit' | 'preview';
type FilterTab = 'all' | 'open' | 'overdue' | 'paid' | 'draft';

/** Dropdown button with PDF / CSV / DATEV options */
function ExportMenu({
  onPdf,
  onCsv,
  onDatev,
  pdfLabel = 'PDF exportieren',
  loading = false,
}: {
  onPdf: () => void;
  onCsv: () => void;
  onDatev: () => void;
  pdfLabel?: string;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button
        size="sm"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="flex items-center gap-1"
      >
        {loading ? 'Exportiere …' : 'Exportieren'}
        <svg className="w-3 h-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-52 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <button
            className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 flex items-center gap-3 border-b border-gray-100"
            onClick={() => { onPdf(); setOpen(false); }}
          >
            <span className="text-lg">📄</span>
            <div>
              <p className="font-medium text-gray-800">{pdfLabel}</p>
              <p className="text-xs text-gray-400">Druckfertig, mit Branding</p>
            </div>
          </button>
          <button
            className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 flex items-center gap-3 border-b border-gray-100"
            onClick={() => { onCsv(); setOpen(false); }}
          >
            <span className="text-lg">📊</span>
            <div>
              <p className="font-medium text-gray-800">CSV exportieren</p>
              <p className="text-xs text-gray-400">Excel / LibreOffice Calc</p>
            </div>
          </button>
          <button
            className="w-full text-left px-4 py-3 text-sm hover:bg-amber-50 flex items-center gap-3"
            onClick={() => { onDatev(); setOpen(false); }}
          >
            <span className="text-lg">🏦</span>
            <div>
              <p className="font-medium text-gray-800">DATEV exportieren</p>
              <p className="text-xs text-gray-400">Buchungsstapel für Steuerberater</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export function InvoiceList() {
  const { company, invoices, addInvoice, updateInvoice, deleteInvoice, updateInvoiceStatus, markPaid, markReminderSent } = useStore();
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [reminderCopied, setReminderCopied] = useState(false);

  // Handle Stripe success redirect: ?payment=success&invoice=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const invoiceId = params.get('invoice');
    if (paymentStatus === 'success' && invoiceId) {
      const inv = invoices.find((i) => i.id === invoiceId);
      if (inv && inv.status !== 'paid') {
        markPaid(invoiceId);
      }
      if (inv) { setSelected(inv); setView('preview'); }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [invoices]);

  function handleCreate(invoice: Invoice) {
    addInvoice(invoice);
    setSelected(invoice);
    setView('preview');
  }

  function handleUpdate(invoice: Invoice) {
    updateInvoice(invoice);
    setSelected(invoice);
    setView('preview');
  }

  function handleDelete(id: string) {
    if (confirm('Rechnung wirklich löschen?')) {
      deleteInvoice(id);
      setView('list');
    }
  }

  async function handlePdfExport(invoice: Invoice) {
    setExporting(true);
    try {
      await exportInvoicePdf('invoice-preview', `Rechnung-${invoice.invoiceNumber}`);
    } finally {
      setExporting(false);
    }
  }

  function handleCsvExport(subset?: Invoice[]) {
    exportCsv(subset ?? invoices, company);
  }

  function handleDatevExport(subset?: Invoice[]) {
    exportDatev(subset ?? invoices, company);
  }

  async function handleReminder(invoice: Invoice) {
    const text = buildReminderText(invoice, company);
    await navigator.clipboard.writeText(text);
    markReminderSent(invoice.id);
    setReminderCopied(true);
    setTimeout(() => setReminderCopied(false), 3000);

    // Browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Zahlungserinnerung kopiert', {
        body: `Mahnung für ${invoice.invoiceNumber} (${invoice.customer.name}) in Zwischenablage.`,
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          new Notification('Zahlungserinnerung kopiert', {
            body: `Mahnung für ${invoice.invoiceNumber} bereit.`,
          });
        }
      });
    }
  }

  // Dashboard stats
  const stats = useMemo(() => {
    let open = 0, openAmt = 0, overdue = 0, overdueAmt = 0, paid = 0, paidAmt = 0;
    for (const inv of invoices) {
      const totals = calcInvoiceTotals(inv.items);
      const gross = company.smallBusiness ? totals.net : totals.gross;
      const eff = effectiveStatus(inv);
      if (eff === 'paid') { paid++; paidAmt += gross; }
      else if (eff === 'overdue') { overdue++; overdueAmt += gross; }
      else if (eff === 'sent') { open++; openAmt += gross; }
    }
    return { open, openAmt, overdue, overdueAmt, paid, paidAmt };
  }, [invoices, company.smallBusiness]);

  const filteredInvoices = useMemo(() => {
    const sorted = [...invoices].sort((a, b) => b.date.localeCompare(a.date));
    if (filter === 'all') return sorted;
    if (filter === 'overdue') return sorted.filter((inv) => effectiveStatus(inv) === 'overdue');
    if (filter === 'open') return sorted.filter((inv) => effectiveStatus(inv) === 'sent');
    if (filter === 'paid') return sorted.filter((inv) => inv.status === 'paid');
    if (filter === 'draft') return sorted.filter((inv) => inv.status === 'draft');
    return sorted;
  }, [invoices, filter]);

  if (view === 'create') {
    return (
      <div>
        <button onClick={() => setView('list')} className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">
          ← Zurück zur Übersicht
        </button>
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Neue Rechnung erstellen</h2>
        <InvoiceForm onSave={handleCreate} onCancel={() => setView('list')} />
      </div>
    );
  }

  if (view === 'edit' && selected) {
    return (
      <div>
        <button onClick={() => setView('preview')} className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">
          ← Zurück zur Vorschau
        </button>
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Rechnung bearbeiten</h2>
        <InvoiceForm initial={selected} onSave={handleUpdate} onCancel={() => setView('preview')} />
      </div>
    );
  }

  if (view === 'preview' && selected) {
    const fresh = invoices.find((inv) => inv.id === selected.id) ?? selected;
    const eff = effectiveStatus(fresh);
    const overdueDays = daysOverdue(fresh.dueDate);
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <button onClick={() => setView('list')} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            ← Zurück zur Übersicht
          </button>
          <div className="flex gap-2 flex-wrap items-center">
            {/* Status selector */}
            <select
              value={fresh.status}
              onChange={(e) => updateInvoiceStatus(fresh.id, e.target.value as Invoice['status'])}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Entwurf</option>
              <option value="sent">Versendet</option>
              <option value="paid">Bezahlt</option>
              <option value="cancelled">Storniert</option>
            </select>
            {/* Quick mark paid */}
            {(eff === 'sent' || eff === 'overdue') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => markPaid(fresh.id)}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                ✓ Als bezahlt markieren
              </Button>
            )}
            {/* Reminder */}
            {eff === 'overdue' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleReminder(fresh)}
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                {reminderCopied ? '✓ Kopiert!' : '✉ Zahlungserinnerung'}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => { setSelected(fresh); setView('edit'); }}>
              Bearbeiten
            </Button>
            <ExportMenu
              loading={exporting}
              pdfLabel="PDF herunterladen"
              onPdf={() => handlePdfExport(fresh)}
              onCsv={() => handleCsvExport([fresh])}
              onDatev={() => handleDatevExport([fresh])}
            />
            <Button variant="danger" size="sm" onClick={() => handleDelete(fresh.id)}>
              Löschen
            </Button>
          </div>
        </div>

        {/* Overdue banner */}
        {eff === 'overdue' && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-red-700 font-semibold text-sm">
                Überfällig seit {overdueDays} {overdueDays === 1 ? 'Tag' : 'Tagen'}
              </p>
              <p className="text-red-500 text-xs mt-0.5">
                Fälligkeitsdatum war {formatDate(fresh.dueDate)}
                {fresh.reminderSentAt && ` · Mahnung versendet am ${formatDate(fresh.reminderSentAt)}`}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => handleReminder(fresh)}
              className="bg-red-600 text-white hover:bg-red-700 border-0 shrink-0"
            >
              {reminderCopied ? '✓ Erinnerung kopiert' : '✉ Erinnerung kopieren'}
            </Button>
          </div>
        )}

        {/* Paid badge */}
        {fresh.status === 'paid' && fresh.paidAt && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-green-700 text-sm">
            Bezahlt am <strong>{formatDate(fresh.paidAt)}</strong>
          </div>
        )}

        {/* Payment buttons */}
        {fresh.status !== 'paid' && fresh.status !== 'cancelled' && (
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <PaymentButtons invoice={fresh} onPaid={() => markPaid(fresh.id)} />
          </div>
        )}

        {/* Dunning panel */}
        {fresh.status !== 'paid' && fresh.status !== 'cancelled' && fresh.status !== 'draft' && (
          <DunningPanel invoice={fresh} />
        )}

        <div className="bg-white rounded-xl shadow-sm border overflow-auto">
          <InvoicePreview invoice={fresh} company={company} />
        </div>
      </div>
    );
  }

  // ── List / Dashboard view ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-800">Rechnungsübersicht</h2>
        <div className="flex gap-2">
          {invoices.length > 0 && (
            <ExportMenu
              pdfLabel="PDF (Rechnung öffnen)"
              onPdf={() => alert('Bitte zuerst eine Rechnung öffnen, um das PDF zu exportieren.')}
              onCsv={() => handleCsvExport()}
              onDatev={() => handleDatevExport()}
            />
          )}
          <Button onClick={() => setView('create')}>+ Neue Rechnung</Button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-sm">Noch keine Rechnungen erstellt.</p>
          <Button className="mt-4" onClick={() => setView('create')}>Erste Rechnung erstellen</Button>
        </div>
      ) : (
        <>
          {/* ── Summary cards ──────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Offen</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.openAmt)}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.open} {stats.open === 1 ? 'Rechnung' : 'Rechnungen'}</p>
            </div>
            <div className={`rounded-xl border p-4 shadow-sm ${stats.overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
              <p className={`text-xs uppercase tracking-wider mb-1 ${stats.overdue > 0 ? 'text-red-400' : 'text-gray-400'}`}>Überfällig</p>
              <p className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>{formatCurrency(stats.overdueAmt)}</p>
              <p className={`text-xs mt-1 ${stats.overdue > 0 ? 'text-red-400' : 'text-gray-400'}`}>{stats.overdue} {stats.overdue === 1 ? 'Rechnung' : 'Rechnungen'}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Bezahlt</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmt)}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.paid} {stats.paid === 1 ? 'Rechnung' : 'Rechnungen'}</p>
            </div>
          </div>

          {/* ── Overdue alert banner ───────────────────────────────────── */}
          {stats.overdue > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="text-red-500 text-lg">⚠</span>
              <p className="text-sm text-red-700 font-medium">
                {stats.overdue} {stats.overdue === 1 ? 'Rechnung ist' : 'Rechnungen sind'} überfällig —
                <button
                  className="underline ml-1 hover:text-red-900"
                  onClick={() => setFilter('overdue')}
                >
                  jetzt anzeigen
                </button>
              </p>
            </div>
          )}

          {/* ── Filter tabs ────────────────────────────────────────────── */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {([
              { id: 'all', label: 'Alle' },
              { id: 'open', label: 'Offen' },
              { id: 'overdue', label: `Überfällig${stats.overdue > 0 ? ` (${stats.overdue})` : ''}` },
              { id: 'paid', label: 'Bezahlt' },
              { id: 'draft', label: 'Entwurf' },
            ] as { id: FilterTab; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === tab.id
                    ? tab.id === 'overdue' && stats.overdue > 0
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Invoice rows ───────────────────────────────────────────── */}
          {filteredInvoices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Keine Rechnungen in dieser Kategorie.</p>
          ) : (
            <div className="grid gap-3">
              {filteredInvoices.map((inv) => {
                const totals = calcInvoiceTotals(inv.items);
                const gross = company.smallBusiness ? totals.net : totals.gross;
                const eff = effectiveStatus(inv);
                const isOverdueInv = eff === 'overdue';
                const days = isOverdueInv ? daysOverdue(inv.dueDate) : 0;

                return (
                  <div
                    key={inv.id}
                    className={`bg-white border rounded-xl shadow-sm flex items-center gap-4 overflow-hidden ${isOverdueInv ? 'border-red-200' : ''}`}
                  >
                    {/* Colored left stripe */}
                    <div
                      className="w-1 self-stretch shrink-0"
                      style={{
                        backgroundColor:
                          eff === 'paid' ? '#16a34a'
                          : eff === 'overdue' ? '#dc2626'
                          : eff === 'sent' ? '#2563eb'
                          : '#9ca3af',
                      }}
                    />
                    {/* Main clickable area */}
                    <button
                      className="flex-1 text-left py-4 pr-2"
                      onClick={() => { setSelected(inv); setView('preview'); }}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-semibold text-gray-800">{inv.invoiceNumber}</p>
                          <p className="text-sm text-gray-500">
                            {inv.customer.name}{inv.customer.company ? ` · ${inv.customer.company}` : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(inv.date)} &middot; fällig {formatDate(inv.dueDate)}
                            {isOverdueInv && (
                              <span className="ml-2 text-red-500 font-medium">
                                ({days} {days === 1 ? 'Tag' : 'Tage'} überfällig)
                              </span>
                            )}
                            {inv.status === 'paid' && inv.paidAt && (
                              <span className="ml-2 text-green-600">· bezahlt {formatDate(inv.paidAt)}</span>
                            )}
                            {inv.reminderSentAt && (
                              <span className="ml-2 text-amber-600">· Mahnung {formatDate(inv.reminderSentAt)}</span>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-gray-900">{formatCurrency(gross)}</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${invoiceStatusColor(eff)}`}>
                            {invoiceStatusLabel(eff)}
                          </span>
                        </div>
                      </div>
                    </button>
                    {/* Quick actions */}
                    <div className="flex gap-1 pr-4 shrink-0">
                      {(eff === 'sent' || eff === 'overdue') && (
                        <button
                          title="Als bezahlt markieren"
                          onClick={(e) => { e.stopPropagation(); markPaid(inv.id); }}
                          className="w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center text-base font-bold"
                        >
                          ✓
                        </button>
                      )}
                      {eff === 'overdue' && (
                        <button
                          title="Zahlungserinnerung kopieren"
                          onClick={(e) => { e.stopPropagation(); handleReminder(inv); }}
                          className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center text-base"
                        >
                          ✉
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {reminderCopied && (
        <div className="fixed bottom-6 right-6 bg-gray-800 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 z-50">
          <span>✓</span> Zahlungserinnerung in Zwischenablage kopiert
        </div>
      )}
    </div>
  );
}
