import { useState, useMemo } from 'react';
import { useStore } from '../store';
import type { Customer } from '../types';
import { CustomerForm } from './CustomerForm';
import { Button } from './ui/Button';
import {
  calcInvoiceTotals,
  formatCurrency,
  formatDate,
  invoiceStatusColor,
  invoiceStatusLabel,
} from '../utils/invoiceUtils';

type View = 'list' | 'history';

export function CustomerList() {
  const { customers, invoices, company, addCustomer, updateCustomer, deleteCustomer } = useStore();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Stats per customer derived from invoices
  const customerStats = useMemo(() => {
    const map: Record<string, { count: number; total: number; lastDate: string }> = {};
    for (const inv of invoices) {
      const id = inv.customer.id;
      const gross = company.smallBusiness
        ? calcInvoiceTotals(inv.items).net
        : calcInvoiceTotals(inv.items).gross;
      if (!map[id]) map[id] = { count: 0, total: 0, lastDate: '' };
      map[id].count += 1;
      map[id].total += gross;
      if (!map[id].lastDate || inv.date > map[id].lastDate) map[id].lastDate = inv.date;
    }
    return map;
  }, [invoices, company.smallBusiness]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  // Sort: customers with most recent invoice first
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const da = customerStats[a.id]?.lastDate ?? '';
        const db = customerStats[b.id]?.lastDate ?? '';
        return db.localeCompare(da);
      }),
    [filtered, customerStats]
  );

  function handleCreate(data: Omit<Customer, 'id'>) {
    addCustomer({ ...data, id: crypto.randomUUID() });
    setCreating(false);
  }

  function handleUpdate(data: Omit<Customer, 'id'>) {
    if (!editing) return;
    updateCustomer({ ...data, id: editing.id });
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (confirm('Kunden wirklich löschen?')) {
      deleteCustomer(id);
      if (selectedId === id) { setSelectedId(null); setView('list'); }
    }
  }

  function openHistory(id: string) {
    setSelectedId(id);
    setView('history');
  }

  // ── History view ──────────────────────────────────────────────────────────
  if (view === 'history' && selectedId) {
    const customer = customers.find((c) => c.id === selectedId);
    const custInvoices = invoices
      .filter((inv) => inv.customer.id === selectedId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const stats = customerStats[selectedId];

    return (
      <div className="space-y-6">
        <button
          onClick={() => setView('list')}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          ← Zurück zur Kundenliste
        </button>

        {customer && (
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <p className="text-xl font-bold text-gray-900">{customer.name}</p>
                {customer.company && <p className="text-gray-500">{customer.company}</p>}
                <p className="text-sm text-gray-500 mt-1">
                  {customer.street}, {customer.zip} {customer.city}, {customer.country}
                </p>
                {customer.email && <p className="text-sm text-gray-400">{customer.email}</p>}
                {customer.taxId && (
                  <p className="text-xs text-gray-400 mt-1">USt-IdNr.: {customer.taxId}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setEditing(customer); setView('list'); }}>
                  Bearbeiten
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(customer.id)}>
                  Löschen
                </Button>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">{stats.count}</p>
                  <p className="text-xs text-gray-400">Rechnungen</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.total)}</p>
                  <p className="text-xs text-gray-400">Gesamtumsatz</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">{formatDate(stats.lastDate)}</p>
                  <p className="text-xs text-gray-400">Letzte Rechnung</p>
                </div>
              </div>
            )}
          </div>
        )}

        <h3 className="font-semibold text-gray-700">Rechnungshistorie</h3>

        {custInvoices.length === 0 ? (
          <p className="text-gray-400 text-sm">Noch keine Rechnungen für diesen Kunden.</p>
        ) : (
          <div className="grid gap-3">
            {custInvoices.map((inv) => {
              const totals = calcInvoiceTotals(inv.items);
              const gross = company.smallBusiness ? totals.net : totals.gross;
              return (
                <div key={inv.id} className="bg-white border rounded-xl p-4 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(inv.date)} &middot; fällig {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(gross)}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${invoiceStatusColor(inv.status)}`}>
                      {invoiceStatusLabel(inv.status)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Kundenverwaltung</h2>
        <Button onClick={() => { setCreating(true); setEditing(null); }}>+ Neuer Kunde</Button>
      </div>

      {/* Search */}
      {customers.length > 0 && (
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            placeholder="Kunden suchen (Name, Firma, Stadt, E-Mail) …"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {creating && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="font-medium mb-4 text-gray-700">Neuen Kunden anlegen</h3>
          <CustomerForm onSave={handleCreate} onCancel={() => setCreating(false)} />
        </div>
      )}

      {editing && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="font-medium mb-4 text-gray-700">Kunde bearbeiten</h3>
          <CustomerForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
        </div>
      )}

      {customers.length === 0 ? (
        <p className="text-gray-400 text-sm">Noch keine Kunden angelegt.</p>
      ) : sorted.length === 0 ? (
        <p className="text-gray-400 text-sm">Kein Kunde gefunden für „{search}".</p>
      ) : (
        <div className="grid gap-3">
          {sorted.map((c) => {
            const stats = customerStats[c.id];
            return (
              <div key={c.id} className="bg-white border rounded-xl p-4 shadow-sm flex justify-between items-start gap-4">
                <button
                  className="flex-1 text-left min-w-0"
                  onClick={() => openHistory(c.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{c.name}</p>
                    {c.company && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c.company}</span>
                    )}
                    {stats && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {stats.count} {stats.count === 1 ? 'Rechnung' : 'Rechnungen'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {c.street}, {c.zip} {c.city}
                  </p>
                  <div className="flex gap-4 mt-1">
                    {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                    {stats && (
                      <p className="text-xs text-gray-400">
                        Umsatz: <span className="font-medium text-gray-600">{formatCurrency(stats.total)}</span>
                        {' '}&middot; zuletzt {formatDate(stats.lastDate)}
                      </p>
                    )}
                  </div>
                </button>
                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => { setEditing(c); setCreating(false); }}>
                    Bearbeiten
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(c.id)}>
                    Löschen
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
