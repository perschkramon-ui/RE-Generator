import { useState, useMemo } from 'react';
import { INDUSTRY_CATALOGS, type CatalogItem, type IndustryCatalog } from '../data/industryCatalogs';
import { useStore } from '../store';
import type { Product, VatRate } from '../types';

interface IndustryCatalogModalProps {
  onClose: () => void;
}

export function IndustryCatalogModal({ onClose }: IndustryCatalogModalProps) {
  const { addProduct, products } = useStore();
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryCatalog | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [importedCount, setImportedCount] = useState<number | null>(null);

  // Generate a stable key for each catalog item
  function itemKey(item: CatalogItem) {
    return `${item.name}:::${item.unitPrice}`;
  }

  // Check which items already exist (by articleNumber first, then name)
  const existingArticleNumbers = useMemo(
    () => new Set(products.map((p) => p.articleNumber?.toLowerCase()).filter(Boolean)),
    [products]
  );
  const existingNames = useMemo(
    () => new Set(products.map((p) => p.name.toLowerCase())),
    [products]
  );

  function alreadyImported(item: CatalogItem): boolean {
    if (item.articleNumber && existingArticleNumbers.has(item.articleNumber.toLowerCase())) return true;
    return existingNames.has(item.name.toLowerCase());
  }

  const filteredItems = useMemo(() => {
    if (!selectedIndustry) return [];
    if (!search.trim()) return selectedIndustry.items;
    const q = search.toLowerCase();
    return selectedIndustry.items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [selectedIndustry, search]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of filteredItems) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return map;
  }, [filteredItems]);

  function toggleItem(key: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    const allKeys = filteredItems.map(itemKey);
    setSelectedItems(new Set(allKeys));
  }

  function selectNone() {
    setSelectedItems(new Set());
  }

  function handleImport() {
    if (!selectedIndustry) return;
    const toImport = selectedIndustry.items.filter((item) =>
      selectedItems.has(itemKey(item))
    );
    let count = 0;
    for (const item of toImport) {
      const product: Product = {
        id: crypto.randomUUID(),
        name: item.name,
        description: item.description,
        unitPrice: item.unitPrice,
        purchasePrice: item.purchasePrice,
        unit: item.unit,
        vatRate: item.vatRate as VatRate,
        category: item.category,
        articleNumber: item.articleNumber,
        trackStock: true,
        stock: 0,
        minStock: item.suggestedMinStock ?? 0,
      };
      addProduct(product);
      count++;
    }
    setImportedCount(count);
    setSelectedItems(new Set());
    setTimeout(() => {
      setImportedCount(null);
      onClose();
    }, 1800);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '100%', maxWidth: 860, maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Branchen-Artikelkatalog</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Wähle eine Branche und importiere passende Artikel in deine Produktliste
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar: Industry selection */}
          <div
            className="border-r border-gray-100 overflow-y-auto shrink-0"
            style={{ width: 220, minWidth: 180 }}
          >
            <div className="p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
                Branche wählen
              </p>
              {INDUSTRY_CATALOGS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedIndustry(cat);
                    setSelectedItems(new Set());
                    setSearch('');
                  }}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all ${
                    selectedIndustry?.id === cat.id
                      ? 'text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  style={
                    selectedIndustry?.id === cat.id
                      ? { backgroundColor: cat.color }
                      : {}
                  }
                >
                  <span className="text-xl leading-none">{cat.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{cat.name}</p>
                    <p
                      className={`text-xs truncate ${
                        selectedIndustry?.id === cat.id ? 'text-white/70' : 'text-gray-400'
                      }`}
                    >
                      {cat.items.length} Artikel
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main area: Item list */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedIndustry ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                <span className="text-5xl mb-4">🗂️</span>
                <p className="font-medium text-gray-600">Branche auswählen</p>
                <p className="text-sm mt-1 text-center">
                  Wähle links eine Branche aus, um die passenden Artikel zu sehen.
                </p>
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                  <div className="relative flex-1">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                    <input
                      type="search"
                      placeholder={`In ${selectedIndustry.name} suchen …`}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2"
                      style={{ '--tw-ring-color': selectedIndustry.color } as React.CSSProperties}
                    />
                  </div>
                  <button
                    onClick={selectAll}
                    className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-50"
                  >
                    Alle
                  </button>
                  <button
                    onClick={selectNone}
                    className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-50"
                  >
                    Keine
                  </button>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: selectedIndustry.color }}
                  >
                    {selectedItems.size} ausgewählt
                  </span>
                </div>

                {/* Item list */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {groupedItems.size === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">
                      Kein Artikel gefunden für „{search}".
                    </p>
                  ) : (
                    Array.from(groupedItems.entries()).map(([category, items]) => (
                      <div key={category}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          {category}
                        </p>
                        <div className="space-y-2">
                          {items.map((item) => {
                            const key = itemKey(item);
                            const alreadyExists = alreadyImported(item);
                            const checked = selectedItems.has(key);
                            return (
                              <label
                                key={key}
                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                  alreadyExists
                                    ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-100'
                                    : checked
                                    ? 'border-blue-300 bg-blue-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                                style={checked && !alreadyExists ? { borderColor: selectedIndustry.color, backgroundColor: `${selectedIndustry.color}10` } : {}}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 rounded"
                                  checked={checked}
                                  disabled={alreadyExists}
                                  onChange={() => !alreadyExists && toggleItem(key)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                                    {item.articleNumber && (
                                      <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                        {item.articleNumber}
                                      </span>
                                    )}
                                    {alreadyExists && (
                                      <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                                        bereits vorhanden
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-bold text-gray-800">
                                    {item.unitPrice === 0
                                      ? '–'
                                      : `${item.unitPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`}
                                  </p>
                                  <p className="text-xs text-gray-400">VK / {item.unit}</p>
                                  {item.purchasePrice && (
                                    <p className="text-[10px] text-gray-400">
                                      EK: {item.purchasePrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4 bg-gray-50">
          {importedCount !== null ? (
            <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {importedCount} Artikel importiert!
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              {selectedIndustry
                ? `${selectedIndustry.name} · ${selectedIndustry.items.length} Artikel verfügbar`
                : 'Wähle eine Branche aus der Liste'}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleImport}
              disabled={selectedItems.size === 0 || importedCount !== null}
              className="px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: selectedIndustry?.color ?? '#3b82f6',
              }}
            >
              {selectedItems.size > 0
                ? `${selectedItems.size} Artikel importieren`
                : 'Artikel auswählen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
