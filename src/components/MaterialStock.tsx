import { useState, useMemo } from 'react';
import { useStore } from '../store';
import type { Product } from '../types';
import { formatCurrency } from '../utils/invoiceUtils';

type StockStatus = 'ok' | 'low' | 'out' | 'untracked';

function getStockStatus(p: Product): StockStatus {
  if (!p.trackStock) return 'untracked';
  const stock = p.stock ?? 0;
  const min = p.minStock ?? 0;
  if (stock === 0) return 'out';
  if (min > 0 && stock <= min) return 'low';
  return 'ok';
}

const STATUS_CONFIG: Record<StockStatus, { label: string; dot: string; bg: string; border: string; text: string }> = {
  ok:       { label: 'Ausreichend',  dot: 'bg-green-500',  bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700' },
  low:      { label: 'Nachbestellen', dot: 'bg-amber-500', bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700' },
  out:      { label: 'Leer',         dot: 'bg-red-500',    bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700' },
  untracked:{ label: 'Kein Tracking',dot: 'bg-gray-300',   bg: 'bg-gray-50',   border: 'border-gray-200',  text: 'text-gray-500' },
};

interface AdjustModalProps {
  product: Product;
  onClose: () => void;
}

function AdjustModal({ product, onClose }: AdjustModalProps) {
  const { adjustStock } = useStore();
  const [mode, setMode] = useState<'in' | 'out'>('in'); // Zugang / Abgang
  const [amount, setAmount] = useState<number>(1);
  const [note, setNote] = useState('');

  function apply() {
    if (amount <= 0) return;
    const delta = mode === 'in' ? amount : -amount;
    adjustStock(product.id, delta);
    onClose();
  }

  const newStock = Math.max(0, (product.stock ?? 0) + (mode === 'in' ? amount : -amount));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Bestand buchen · Aktuell: <strong className="text-gray-800">{product.stock ?? 0} {product.unit}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => setMode('in')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
              mode === 'in' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Zugang / Lieferung
          </button>
          <button
            onClick={() => setMode('out')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
              mode === 'out' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            Abgang / Verbrauch
          </button>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Menge ({product.unit})
          </label>
          <input
            type="number"
            min={0.01}
            step="any"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notiz */}
        <div className="mb-5">
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Notiz (optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z. B. Lieferung Elektro-Fachmarkt / Baustelle Müller"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Preview */}
        <div className={`rounded-xl p-3 mb-5 flex items-center gap-3 ${mode === 'in' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <span className="text-2xl">{mode === 'in' ? '📦' : '🔧'}</span>
          <div className="text-sm">
            <p className="font-semibold text-gray-800">
              {product.stock ?? 0} → <strong className={mode === 'in' ? 'text-green-700' : 'text-red-700'}>{newStock} {product.unit}</strong>
            </p>
            <p className="text-gray-500">
              {mode === 'in' ? `+${amount} ${product.unit} Zugang` : `-${amount} ${product.unit} Abgang`}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={apply}
            disabled={amount <= 0}
            className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 ${
              mode === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            Buchen
          </button>
        </div>
      </div>
    </div>
  );
}

export function MaterialStock() {
  const { products } = useStore();
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'reorder'>('all');
  const [search, setSearch] = useState('');
  const [adjusting, setAdjusting] = useState<Product | null>(null);

  const trackedProducts = useMemo(
    () => products.filter((p) => p.trackStock),
    [products]
  );

  const stats = useMemo(() => ({
    total: trackedProducts.length,
    ok: trackedProducts.filter((p) => getStockStatus(p) === 'ok').length,
    low: trackedProducts.filter((p) => getStockStatus(p) === 'low').length,
    out: trackedProducts.filter((p) => getStockStatus(p) === 'out').length,
  }), [trackedProducts]);

  const filtered = useMemo(() => {
    let list = trackedProducts;

    if (filter === 'low') list = list.filter((p) => getStockStatus(p) === 'low');
    else if (filter === 'out') list = list.filter((p) => getStockStatus(p) === 'out');
    else if (filter === 'reorder') list = list.filter((p) => ['low', 'out'].includes(getStockStatus(p)));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q) ||
          (p.articleNumber ?? '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      // Sort: out first, then low, then ok
      const order: Record<StockStatus, number> = { out: 0, low: 1, ok: 2, untracked: 3 };
      return order[getStockStatus(a)] - order[getStockStatus(b)];
    });
  }, [trackedProducts, filter, search]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const p of filtered) {
      const cat = p.category || 'Ohne Kategorie';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return map;
  }, [filtered]);

  if (trackedProducts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-5xl mb-4">📦</p>
        <p className="font-medium text-gray-600">Noch keine Artikel mit Lagertracking</p>
        <p className="text-sm mt-1 max-w-sm mx-auto">
          Aktiviere für Artikel in der Artikelliste „Bestand verfolgen" oder importiere Materialien aus dem Branchen-Katalog.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {adjusting && <AdjustModal product={adjusting} onClose={() => setAdjusting(null)} />}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Gesamt', value: stats.total, icon: '📦', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
          { label: 'Ausreichend', value: stats.ok, icon: '✅', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
          { label: 'Nachbestellen', value: stats.low, icon: '⚠️', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Leer', value: stats.out, icon: '🚨', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-4 ${s.bg}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{s.icon}</span>
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            placeholder="Artikel suchen …"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {([
            { key: 'all', label: 'Alle' },
            { key: 'reorder', label: '⚠ Nachbestellen' },
            { key: 'out', label: '🚨 Leer' },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reorder notice */}
      {(stats.low + stats.out) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">🛒</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {stats.out} leere + {stats.low} zu wenig — {stats.low + stats.out} Artikel müssen nachbestellt werden
            </p>
          </div>
          <button
            onClick={() => setFilter('reorder')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
          >
            Filtern
          </button>
        </div>
      )}

      {/* Product list */}
      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Kein Artikel gefunden.</p>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
              <div className="space-y-2">
                {items.map((p) => {
                  const status = getStockStatus(p);
                  const cfg = STATUS_CONFIG[status];
                  const stockPct = p.minStock && p.minStock > 0 ? Math.min(100, ((p.stock ?? 0) / (p.minStock * 2)) * 100) : null;

                  return (
                    <div
                      key={p.id}
                      className={`border rounded-xl p-4 flex items-center gap-4 ${cfg.border} ${cfg.bg}`}
                    >
                      {/* Status dot */}
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800 text-sm">{p.name}</span>
                          {p.articleNumber && (
                            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {p.articleNumber}
                            </span>
                          )}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </div>

                        {/* Stock bar */}
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="text-sm">
                            <span className="font-bold text-gray-800">{p.stock ?? 0}</span>
                            <span className="text-gray-400 text-xs"> / {p.unit}</span>
                            {p.minStock != null && p.minStock > 0 && (
                              <span className="text-gray-400 text-xs"> (Min: {p.minStock})</span>
                            )}
                          </div>
                          {stockPct !== null && (
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full max-w-32 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  status === 'out' ? 'bg-red-500' :
                                  status === 'low' ? 'bg-amber-400' : 'bg-green-500'
                                }`}
                                style={{ width: `${stockPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Prices */}
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-sm font-semibold text-gray-800">
                          {formatCurrency(p.unitPrice)} <span className="text-xs font-normal text-gray-400">/ {p.unit}</span>
                        </p>
                        {p.purchasePrice && p.purchasePrice > 0 && (
                          <p className="text-xs text-gray-400">Einkauf: {formatCurrency(p.purchasePrice)}</p>
                        )}
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => setAdjusting(p)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Buchen
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
