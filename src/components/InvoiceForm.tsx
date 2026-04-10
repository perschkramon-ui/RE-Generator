import { useState, useMemo, useRef } from 'react';
import { useStore } from '../store';
import type { Customer, Invoice, LineItem } from '../types';
import { addDays, todayIso, formatDate } from '../utils/invoiceUtils';
import { LineItemsEditor } from './LineItemsEditor';
import { AIWizard } from './AIWizard';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';

interface Props {
  initial?: Invoice;
  onSave: (invoice: Invoice) => void;
  onCancel: () => void;
}

export function InvoiceForm({ initial, onSave, onCancel }: Props) {
  const { company, customers, invoices, getNextInvoiceNumber, incrementInvoiceNumber } = useStore();

  const today = todayIso();
  const [invoiceNumber] = useState(initial?.invoiceNumber ?? getNextInvoiceNumber());
  const [date, setDate] = useState(initial?.date ?? today);
  const [serviceDate, setServiceDate] = useState(initial?.serviceDate ?? today);
  const [serviceDateEnd, setServiceDateEnd] = useState(initial?.serviceDateEnd ?? '');
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ?? addDays(today, company.defaultPaymentDays)
  );
  const [customerId, setCustomerId] = useState(initial?.customer.id ?? '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<LineItem[]>(
    initial?.items ?? [
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unit: 'Stk.',
        unitPrice: 0,
        vatRate: company.smallBusiness ? 0 : 19,
      },
    ]
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAI, setShowAI] = useState(false);

  const selectedCustomer: Customer | undefined = customers.find((c) => c.id === customerId);

  // Recent customers: sorted by last invoice date (most recent first)
  const recentCustomers = useMemo(() => {
    const lastDate: Record<string, string> = {};
    for (const inv of invoices) {
      const id = inv.customer.id;
      if (!lastDate[id] || inv.date > lastDate[id]) lastDate[id] = inv.date;
    }
    return [...customers]
      .filter((c) => lastDate[c.id])
      .sort((a, b) => (lastDate[b.id] ?? '').localeCompare(lastDate[a.id] ?? ''))
      .slice(0, 5);
  }, [customers, invoices]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  function selectCustomer(c: Customer) {
    setCustomerId(c.id);
    setCustomerSearch('');
    setCustomerDropdownOpen(false);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!customerId) e.customer = 'Bitte einen Kunden auswählen.';
    if (items.length === 0) e.items = 'Mindestens eine Position erforderlich.';
    if (items.some((it) => !it.description.trim())) e.items = 'Alle Positionen brauchen eine Beschreibung.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate() || !selectedCustomer) return;

    const invoice: Invoice = {
      id: initial?.id ?? crypto.randomUUID(),
      invoiceNumber,
      date,
      serviceDate,
      serviceDateEnd: serviceDateEnd || undefined,
      dueDate,
      customer: selectedCustomer,
      items,
      notes: notes || undefined,
      status: initial?.status ?? 'draft',
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };

    onSave(invoice);
    if (!initial) incrementInvoiceNumber();
  }

  if (company.name === '') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800 text-sm">
        Bitte zuerst die <strong>Firmeneinstellungen</strong> vollständig ausfüllen (Pflicht gem. §14 UStG).
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Rechnungsnummer</label>
          <p className="mt-1 px-3 py-2 bg-gray-100 rounded-md text-sm font-mono text-gray-700">{invoiceNumber}</p>
          <p className="text-xs text-gray-400 mt-0.5">Automatisch fortlaufend (§14 Abs. 4 Nr. 4 UStG)</p>
        </div>
        <Input
          label="Rechnungsdatum"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input
          label="Leistungsdatum"
          type="date"
          required
          value={serviceDate}
          onChange={(e) => setServiceDate(e.target.value)}
        />
        <Input
          label="Leistungszeitraum Ende (optional)"
          type="date"
          value={serviceDateEnd}
          onChange={(e) => setServiceDateEnd(e.target.value)}
        />
        <Input
          label="Fällig am"
          type="date"
          required
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      {/* Customer picker */}
      <div>
        <label className="text-sm font-medium text-gray-700">
          Empfänger <span className="text-red-500">*</span>
        </label>

        {/* Quick-select: recent customers */}
        {recentCustomers.length > 0 && !selectedCustomer && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-gray-400 self-center">Zuletzt:</span>
            {recentCustomers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCustomer(c)}
                className="text-xs border border-gray-300 rounded-full px-3 py-1 bg-white hover:bg-blue-50 hover:border-blue-400 text-gray-700 transition-colors"
              >
                {c.name}{c.company ? ` · ${c.company}` : ''}
              </button>
            ))}
          </div>
        )}

        {/* Selected customer display */}
        {selectedCustomer ? (
          <div className="mt-2 flex items-start justify-between gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm">
              <p className="font-semibold text-gray-800">{selectedCustomer.name}</p>
              {selectedCustomer.company && <p className="text-gray-500 text-xs">{selectedCustomer.company}</p>}
              <p className="text-gray-500 text-xs">
                {selectedCustomer.street}, {selectedCustomer.zip} {selectedCustomer.city}, {selectedCustomer.country}
              </p>
              {selectedCustomer.taxId && (
                <p className="text-xs text-gray-400 mt-0.5">USt-IdNr.: {selectedCustomer.taxId}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setCustomerId(''); setCustomerDropdownOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}
              className="text-xs text-blue-600 hover:underline shrink-0"
            >
              Ändern
            </button>
          </div>
        ) : (
          <div className="relative mt-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Kunde suchen oder auswählen …"
                value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setCustomerDropdownOpen(true); }}
                onFocus={() => setCustomerDropdownOpen(true)}
                onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 150)}
                className={`w-full border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customer ? 'border-red-400' : 'border-gray-300'}`}
              />
            </div>
            {customerDropdownOpen && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <p className="text-sm text-gray-400 p-3">Kein Kunde gefunden.</p>
                ) : (
                  filteredCustomers.map((c) => {
                    const lastInv = invoices
                      .filter((inv) => inv.customer.id === c.id)
                      .sort((a, b) => b.date.localeCompare(a.date))[0];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => selectCustomer(c)}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex justify-between items-center gap-2 border-b border-gray-50 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">{c.name}</p>
                          {c.company && <p className="text-xs text-gray-400">{c.company}</p>}
                          <p className="text-xs text-gray-400">{c.zip} {c.city}</p>
                        </div>
                        {lastInv && (
                          <span className="text-xs text-gray-400 shrink-0">
                            zuletzt {formatDate(lastInv.date)}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
        {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Positionen (Leistungsbeschreibung)</h3>
          <button
            type="button"
            onClick={() => setShowAI(true)}
            className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 border border-purple-200 rounded-full px-3 py-1 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            ✨ KI-Assistent
          </button>
        </div>
        {errors.items && <p className="text-xs text-red-500 mb-2">{errors.items}</p>}
        <LineItemsEditor
          items={items}
          smallBusiness={company.smallBusiness}
          onChange={setItems}
        />
      </div>

      {/* Notes */}
      <Textarea
        label="Anmerkungen / Zahlungshinweise"
        placeholder="z. B. Zahlbar innerhalb von 14 Tagen ohne Abzug. Vielen Dank!"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>Abbrechen</Button>
        <Button type="button" onClick={handleSave}>
          {initial ? 'Änderungen speichern' : 'Rechnung erstellen'}
        </Button>
      </div>

      {/* AI Wizard modal */}
      {showAI && (
        <AIWizard
          onApply={(aiItems, aiNotes, customerHint) => {
            setItems(aiItems);
            if (aiNotes) setNotes(aiNotes);
            if (customerHint && !customerId) {
              // try to find matching customer
              const match = customers.find(
                (c) =>
                  c.name.toLowerCase().includes(customerHint.toLowerCase()) ||
                  (c.company ?? '').toLowerCase().includes(customerHint.toLowerCase())
              );
              if (match) setCustomerId(match.id);
            }
            setShowAI(false);
          }}
          onClose={() => setShowAI(false)}
        />
      )}
    </div>
  );
}
