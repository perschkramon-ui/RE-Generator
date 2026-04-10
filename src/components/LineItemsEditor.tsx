import { useState, useMemo } from 'react';
import type { LineItem, VatRate } from '../types';
import { useStore } from '../store';
import { calcLineTotals, formatCurrency } from '../utils/invoiceUtils';
import { Button } from './ui/Button';
import { AIDescriptionButton } from './AIDescriptionButton';

const VAT_OPTIONS: VatRate[] = [0, 7, 19];
const UNIT_OPTIONS = ['Stk.', 'Std.', 'Tage', 'Monat', 'pauschal', 'km', 'l', 'kg'];

interface Props {
  items: LineItem[];
  smallBusiness: boolean;
  onChange: (items: LineItem[]) => void;
}

function newItem(defaultVat: VatRate = 19): LineItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unit: 'Stk.',
    unitPrice: 0,
    vatRate: defaultVat,
  };
}

/** Inline product search dropdown for a single row */
function ProductSearch({ itemId, onSelect }: { itemId: string; onSelect: (id: string, field: keyof LineItem, value: string | number) => void }) {
  const { products } = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    if (!q) return products.slice(0, 8);
    const lq = q.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(lq) || p.description.toLowerCase().includes(lq) || (p.category ?? '').toLowerCase().includes(lq)
    ).slice(0, 8);
  }, [q, products]);

  if (products.length === 0) return null;

  function applyProduct(pid: string) {
    const p = products.find((pr) => pr.id === pid);
    if (!p) return;
    onSelect(itemId, 'description', p.description);
    onSelect(itemId, 'unitPrice', p.unitPrice);
    onSelect(itemId, 'unit', p.unit);
    onSelect(itemId, 'vatRate', p.vatRate);
    setQ('');
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        title="Aus Leistungskatalog wählen"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Aus Katalog
      </button>
      {open && (
        <div className="absolute z-30 left-0 top-6 w-72 bg-white border border-gray-200 rounded-lg shadow-xl">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              placeholder="Leistung suchen …"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="text-xs text-gray-400 p-3">Keine Treffer.</p>
            ) : matches.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => applyProduct(p.id)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-50 last:border-0"
              >
                <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-400 truncate">{p.description}</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {formatCurrency(p.unitPrice)} / {p.unit} &middot; {p.vatRate} % MwSt.
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function LineItemsEditor({ items, smallBusiness, onChange }: Props) {
  const defaultVat: VatRate = smallBusiness ? 0 : 19;

  function update(id: string, field: keyof LineItem, value: string | number) {
    onChange(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }

  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }

  function add() {
    onChange([...items, newItem(defaultVat)]);
  }

  return (
    <div className="space-y-3">
      <div className="hidden sm:grid grid-cols-[2fr_80px_100px_90px_80px_36px] gap-2 text-xs font-medium text-gray-500 px-1">
        <span>Beschreibung *</span>
        <span>Menge *</span>
        <span>Einheit</span>
        <span>Einzelpreis *</span>
        <span>{smallBusiness ? 'MwSt.' : 'MwSt. %'}</span>
        <span />
      </div>

      {items.map((item) => {
        const { net, vat, gross } = calcLineTotals(item);
        return (
          <div key={item.id} className="bg-gray-50 border rounded-lg p-3 space-y-2">
            {/* Catalog picker row + AI */}
            <div className="flex items-center justify-between gap-3">
              <ProductSearch itemId={item.id} onSelect={update} />
              <AIDescriptionButton
                currentText={item.description}
                onGenerated={(text) => update(item.id, 'description', text)}
              />
            </div>

            <div className="grid sm:grid-cols-[2fr_80px_100px_90px_80px_36px] gap-2 items-start">
              {/* Description */}
              <div className="sm:col-span-1">
                <label className="text-xs text-gray-500 sm:hidden">Beschreibung *</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  placeholder="Leistungsbeschreibung …"
                  value={item.description}
                  onChange={(e) => update(item.id, 'description', e.target.value)}
                />
              </div>
              {/* Quantity */}
              <div>
                <label className="text-xs text-gray-500 sm:hidden">Menge *</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={item.quantity}
                  onChange={(e) => update(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                />
              </div>
              {/* Unit */}
              <div>
                <label className="text-xs text-gray-500 sm:hidden">Einheit</label>
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={item.unit}
                  onChange={(e) => update(item.id, 'unit', e.target.value)}
                >
                  {UNIT_OPTIONS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              {/* Unit Price */}
              <div>
                <label className="text-xs text-gray-500 sm:hidden">Einzelpreis *</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm pr-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={item.unitPrice}
                    onChange={(e) => update(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                </div>
              </div>
              {/* VAT */}
              <div>
                <label className="text-xs text-gray-500 sm:hidden">MwSt. %</label>
                <select
                  disabled={smallBusiness}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  value={item.vatRate}
                  onChange={(e) => update(item.id, 'vatRate', parseInt(e.target.value) as VatRate)}
                >
                  {VAT_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r} %</option>
                  ))}
                </select>
              </div>
              {/* Delete */}
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="self-center text-red-400 hover:text-red-600 text-lg leading-none mt-4 sm:mt-0"
                title="Position entfernen"
              >
                ×
              </button>
            </div>
            {/* Row totals */}
            <div className="flex gap-4 text-xs text-gray-500 justify-end">
              <span>Netto: <strong className="text-gray-700">{formatCurrency(net)}</strong></span>
              {!smallBusiness && <span>MwSt.: <strong className="text-gray-700">{formatCurrency(vat)}</strong></span>}
              <span>Gesamt: <strong className="text-gray-800">{formatCurrency(gross)}</strong></span>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="secondary" size="sm" onClick={add}>
        + Position hinzufügen
      </Button>
    </div>
  );
}


