import { useState, useMemo } from 'react';
import { useStore } from '../store';
import type { Product } from '../types';
import { ProductForm } from './ProductForm';
import { Button } from './ui/Button';
import { formatCurrency } from '../utils/invoiceUtils';

export function ProductList() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  function handleCreate(data: Omit<Product, 'id'>) {
    addProduct({ ...data, id: crypto.randomUUID() });
    setCreating(false);
  }

  function handleUpdate(data: Omit<Product, 'id'>) {
    if (!editing) return;
    updateProduct({ ...data, id: editing.id });
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (confirm('Produkt / Leistung wirklich löschen?')) deleteProduct(id);
  }

  // Group by category
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q)
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Produkte &amp; Leistungen</h2>
        <Button onClick={() => { setCreating(true); setEditing(null); }}>+ Neu anlegen</Button>
      </div>

      {creating && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="font-medium mb-4 text-gray-700">Neue Leistung anlegen</h3>
          <ProductForm onSave={handleCreate} onCancel={() => setCreating(false)} />
        </div>
      )}

      {editing && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="font-medium mb-4 text-gray-700">Leistung bearbeiten</h3>
          <ProductForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
        </div>
      )}

      {products.length > 0 && (
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            placeholder="Leistungen suchen …"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-sm">Noch keine Produkte oder Leistungen angelegt.</p>
          <p className="text-xs mt-1">Gespeicherte Leistungen lassen sich direkt in Rechnungen einfügen.</p>
          <Button className="mt-4" onClick={() => setCreating(true)}>Erste Leistung anlegen</Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">Kein Ergebnis für „{search}".</p>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
              <div className="grid gap-3">
                {items.map((p) => (
                  <div key={p.id} className="bg-white border rounded-xl p-4 shadow-sm flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800">{p.name}</p>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {p.vatRate} % MwSt.
                        </span>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {p.unit}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{p.description}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-1">
                        {formatCurrency(p.unitPrice)} <span className="font-normal text-gray-400 text-xs">netto / {p.unit}</span>
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="secondary" size="sm" onClick={() => { setEditing(p); setCreating(false); }}>
                        Bearbeiten
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>
                        Löschen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
