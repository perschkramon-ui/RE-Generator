import { useState, useMemo } from 'react';
import type { Product, LineItem, Customer } from '../types';
import { useStore } from '../store';
import { calcInvoiceTotals, formatCurrency } from '../utils/invoiceUtils';

interface QuantityEntry {
  product: Product;
  quantity: number;
}

interface Props {
  onClose: () => void;
}

export function QuickInvoiceModal({ onClose }: Props) {
  const { products, customers, company, addInvoice, adjustStock } = useStore();
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // ── Filter products ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q) ||
        (p.articleNumber ?? '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of filtered) {
      const cat = p.category || 'Ohne Kategorie';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return map;
  }, [filtered]);

  // ── Selected items ────────────────────────────────────────────────────────
  const selectedItems: QuantityEntry[] = useMemo(
    () =>
      products
        .map((p) => ({ product: p, quantity: quantities[p.id] ?? 0 }))
        .filter((e) => e.quantity > 0),
    [products, quantities]
  );

  function setQty(id: string, val: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, val) }));
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const lineItems: LineItem[] = selectedItems.map((e) => ({
    id: crypto.randomUUID(),
    description: e.product.description,
    quantity: e.quantity,
    unit: e.product.unit,
    unitPrice: e.product.unitPrice,
    vatRate: e.product.vatRate,
  }));

  const totals = calcInvoiceTotals(lineItems);
  const displayTotal = company.smallBusiness ? totals.net : totals.gross;

  // ── Create invoice ────────────────────────────────────────────────────────
  function buildInvoiceNumber() {
    const fmt = company.numberFormat || '{PREFIX}-{YEAR}-{NUM}';
    const num = String(company.nextInvoiceNumber ?? 1).padStart(company.numberPadding ?? 3, '0');
    const year = new Date().getFullYear();
    return fmt
      .replace('{PREFIX}', company.invoicePrefix ?? 'RE')
      .replace('{YEAR}', String(year))
      .replace('{NUM}', num);
  }

  function handleSubmit() {
    if (selectedItems.length === 0) return;

    const customer: Customer | undefined = customers.find((c) => c.id === selectedCustomerId);
    const today = new Date().toISOString().slice(0, 10);
    const dueDays = company.defaultPaymentDays ?? 14;
    const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().slice(0, 10);

    // Placeholder customer if none selected
    const invoiceCustomer: Customer = customer ?? {
      id: '',
      name: 'Bar / Kasse',
      street: '',
      zip: '',
      city: '',
      country: 'DE',
    };

    const invoice = {
      id: crypto.randomUUID(),
      invoiceNumber: buildInvoiceNumber(),
      date: today,
      serviceDate: today,
      dueDate,
      customer: invoiceCustomer,
      items: lineItems,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
    };

    addInvoice(invoice);

    // Deduct stock for tracked items
    for (const e of selectedItems) {
      if (e.product.trackStock) {
        adjustStock(e.product.id, -e.quantity);
      }
    }

    // Navigate to invoices tab
    window.dispatchEvent(new CustomEvent('navigate-to-invoices'));

    onClose();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full"
        style={{ maxWidth: 780, maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧾</span>
            <div>
              <h2 className="font-bold text-gray-900">Schnellrechnung erstellen</h2>
              <p className="text-xs text-gray-400 mt-0.5">Artikel wählen → Menge → Rechnung</p>
            </div>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-800 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Left: article picker ── */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100">
            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="search"
                  placeholder="Artikel suchen …"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Article list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {products.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Noch keine Artikel angelegt.</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Keine Ergebnisse.</p>
              ) : (
                Array.from(grouped.entries()).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
                    <div className="space-y-1.5">
                      {items.map((p) => {
                        const qty = quantities[p.id] ?? 0;
                        const stockOk = !p.trackStock || (p.stock ?? 0) > 0;
                        const stockWarn = p.trackStock && qty > 0 && qty > (p.stock ?? 0);

                        return (
                          <div
                            key={p.id}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                              qty > 0
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                            }`}
                          >
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-semibold text-gray-800">{p.name}</span>
                                {p.articleNumber && (
                                  <span className="text-[10px] font-mono text-gray-400 bg-white border border-gray-200 px-1 rounded">
                                    {p.articleNumber}
                                  </span>
                                )}
                                {p.trackStock && (
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                    (p.stock ?? 0) === 0
                                      ? 'bg-red-100 text-red-600'
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {(p.stock ?? 0) === 0 ? '🚨 Leer' : `✓ ${p.stock} ${p.unit}`}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{p.description}</p>
                              {stockWarn && (
                                <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                                  ⚠ Nur {p.stock} {p.unit} auf Lager
                                </p>
                              )}
                            </div>

                            {/* Price */}
                            <div className="shrink-0 text-right hidden sm:block">
                              <p className="text-sm font-semibold text-blue-700">
                                {formatCurrency(p.unitPrice)}
                              </p>
                              <p className="text-[10px] text-gray-400">/ {p.unit}</p>
                            </div>

                            {/* Quantity input */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setQty(p.id, qty - 1)}
                                disabled={qty === 0}
                                className="w-7 h-7 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center font-bold text-lg leading-none transition-colors"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min={0}
                                step={p.unit === 'm' || p.unit === 'l' || p.unit === 'kg' ? 0.1 : 1}
                                value={qty === 0 ? '' : qty}
                                placeholder="0"
                                onChange={(e) => setQty(p.id, parseFloat(e.target.value) || 0)}
                                className={`w-14 text-center border rounded-lg px-1 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                  qty > 0 ? 'border-blue-400 bg-white' : 'border-gray-200 bg-white'
                                } ${!stockOk ? 'opacity-50' : ''}`}
                              />
                              <button
                                onClick={() => setQty(p.id, qty + 1)}
                                className="w-7 h-7 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center font-bold text-lg leading-none transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Right: summary panel ── */}
          <div className="w-64 flex flex-col bg-gray-50" style={{ minWidth: 220 }}>
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Ausgewählte Positionen
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedItems.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  Noch keine Artikel ausgewählt.<br />Menge eingeben um zu starten.
                </p>
              ) : (
                selectedItems.map((e) => (
                  <div key={e.product.id}
                    className="bg-white border border-gray-200 rounded-lg p-2.5 flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{e.product.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {e.quantity} × {formatCurrency(e.product.unitPrice)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-gray-800">
                        {formatCurrency(e.quantity * e.product.unitPrice)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer selection */}
            <div className="border-t border-gray-200 p-3 space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                  Kunde (optional)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Bar / Kasse</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Totals */}
              {selectedItems.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 space-y-1">
                  {!company.smallBusiness && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Netto</span>
                      <span>{formatCurrency(totals.net)}</span>
                    </div>
                  )}
                  {!company.smallBusiness && Object.entries(totals.vatAmounts).map(([rate, amt]) => (
                    <div key={rate} className="flex justify-between text-xs text-gray-500">
                      <span>MwSt. {rate} %</span>
                      <span>{formatCurrency(amt)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold text-blue-800 border-t border-blue-200 pt-1 mt-1">
                    <span>{company.smallBusiness ? 'Gesamt' : 'Brutto'}</span>
                    <span>{formatCurrency(displayTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-4 bg-white">
          <button onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            Abbrechen
          </button>
          <div className="flex items-center gap-3">
            {selectedItems.length > 0 && (
              <span className="text-sm text-gray-400">
                {selectedItems.length} {selectedItems.length === 1 ? 'Artikel' : 'Artikel'} · {formatCurrency(displayTotal)}
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={selectedItems.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v16m8-8H4" />
              </svg>
              Rechnung als Entwurf erstellen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
