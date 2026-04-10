import { useState, useMemo } from 'react';
import { useStore } from '../store';
import type { Customer, LineItem, RecurringInvoice, RecurringInterval } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { LineItemsEditor } from './LineItemsEditor';
import {
  formatCurrency,
  formatDate,
  calcInvoiceTotals,
  recurringIntervalLabel,
  todayIso,
} from '../utils/invoiceUtils';

const INTERVALS: RecurringInterval[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

interface FormState {
  name: string;
  interval: RecurringInterval;
  dayOfMonth: number;
  customerId: string;
  items: LineItem[];
  notes: string;
  startDate: string;
  autoSendEmail: boolean;
}

function defaultForm(): FormState {
  return {
    name: '',
    interval: 'monthly',
    dayOfMonth: 1,
    customerId: '',
    items: [],
    notes: '',
    startDate: todayIso(),
    autoSendEmail: false,
  };
}

interface FormProps {
  initial?: RecurringInvoice;
  onSave: (r: Omit<RecurringInvoice, 'id' | 'createdAt' | 'lastGeneratedAt'>) => void;
  onCancel: () => void;
}

function RecurringForm({ initial, onSave, onCancel }: FormProps) {
  const { customers, company } = useStore();
  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          name: initial.name,
          interval: initial.interval,
          dayOfMonth: initial.dayOfMonth,
          customerId: initial.customer.id,
          items: initial.items,
          notes: initial.notes ?? '',
          startDate: initial.nextDate,
          autoSendEmail: initial.autoSendEmail,
        }
      : defaultForm()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedCustomer: Customer | undefined = customers.find((c) => c.id === form.customerId);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Pflichtfeld';
    if (!form.customerId) e.customer = 'Bitte Kunden auswählen';
    if (form.items.length === 0) e.items = 'Mindestens eine Position';
    if (form.items.some((it) => !it.description.trim())) e.items = 'Alle Positionen brauchen eine Beschreibung';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate() || !selectedCustomer) return;
    onSave({
      name: form.name,
      active: initial?.active ?? true,
      interval: form.interval,
      dayOfMonth: form.dayOfMonth,
      customer: selectedCustomer,
      items: form.items,
      notes: form.notes || undefined,
      nextDate: form.startDate,
      autoSendEmail: form.autoSendEmail,
    });
  }

  const totals = useMemo(() => calcInvoiceTotals(form.items), [form.items]);
  const gross = company.smallBusiness ? totals.net : totals.gross;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input
            label="Bezeichnung (intern)"
            required
            placeholder="z. B. Monatshosting Müller GmbH"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
        </div>

        {/* Interval */}
        <Select
          label="Intervall"
          value={form.interval}
          onChange={(e) => setForm({ ...form, interval: e.target.value as RecurringInterval })}
        >
          {INTERVALS.map((iv) => (
            <option key={iv} value={iv}>{recurringIntervalLabel(iv)}</option>
          ))}
        </Select>

        {/* Day of month */}
        {(form.interval === 'monthly' || form.interval === 'quarterly') && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Am … des Monats</label>
            <select
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.dayOfMonth}
              onChange={(e) => setForm({ ...form, dayOfMonth: parseInt(e.target.value) })}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}.</option>
              ))}
            </select>
          </div>
        )}

        {/* Start / next date */}
        <Input
          label="Erste / nächste Ausführung"
          type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
        />
      </div>

      {/* Customer */}
      <div>
        <Select
          label="Kunde"
          required
          value={form.customerId}
          onChange={(e) => setForm({ ...form, customerId: e.target.value })}
          error={errors.customer}
        >
          <option value="">– Kunden auswählen –</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.company ? ` (${c.company})` : ''}
            </option>
          ))}
        </Select>
      </div>

      {/* Line items */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Positionen</p>
        {errors.items && <p className="text-xs text-red-500 mb-2">{errors.items}</p>}
        <LineItemsEditor
          items={form.items}
          smallBusiness={company.smallBusiness}
          onChange={(items) => setForm({ ...form, items })}
        />
        {form.items.length > 0 && (
          <p className="text-sm text-right mt-2 text-gray-500">
            Betrag pro Ausführung: <strong className="text-gray-800">{formatCurrency(gross)}</strong>
          </p>
        )}
      </div>

      <Textarea
        label="Notizen / Zahlungshinweise"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
      />

      {/* Auto email */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="w-4 h-4 rounded accent-blue-600"
          checked={form.autoSendEmail}
          onChange={(e) => setForm({ ...form, autoSendEmail: e.target.checked })}
        />
        <span className="text-sm text-gray-700">
          Erinnerungstext automatisch in Zwischenablage kopieren wenn Rechnung generiert wird
        </span>
      </label>

      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onCancel}>Abbrechen</Button>
        <Button onClick={handleSave}>
          {initial ? 'Änderungen speichern' : 'Abo anlegen'}
        </Button>
      </div>
    </div>
  );
}

// ── Main list ──────────────────────────────────────────────────────────────────

export function RecurringList() {
  const { recurringInvoices, addRecurring, updateRecurring, deleteRecurring, toggleRecurring, generateDueInvoices, company } = useStore();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RecurringInvoice | null>(null);
  const [lastGenResult, setLastGenResult] = useState<{ generated: number; invoiceNumbers: string[] } | null>(null);

  function handleCreate(data: Omit<RecurringInvoice, 'id' | 'createdAt' | 'lastGeneratedAt'>) {
    addRecurring({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    setCreating(false);
  }

  function handleUpdate(data: Omit<RecurringInvoice, 'id' | 'createdAt' | 'lastGeneratedAt'>) {
    if (!editing) return;
    updateRecurring({ ...data, id: editing.id, createdAt: editing.createdAt, lastGeneratedAt: editing.lastGeneratedAt });
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (confirm('Abo wirklich löschen?')) deleteRecurring(id);
  }

  function handleGenerateNow() {
    const result = generateDueInvoices();
    setLastGenResult(result);
    setTimeout(() => setLastGenResult(null), 6000);
  }

  const today = todayIso();
  const dueCount = recurringInvoices.filter((r) => r.active && r.nextDate <= today).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Wiederkehrende Rechnungen</h2>
          <p className="text-xs text-gray-400 mt-0.5">Abos, Retainer, Daueraufträge — automatisch fortlaufend</p>
        </div>
        <div className="flex gap-2 items-center">
          {dueCount > 0 && (
            <Button onClick={handleGenerateNow} className="bg-amber-500 hover:bg-amber-600 border-0 text-white">
              ⚡ {dueCount} {dueCount === 1 ? 'Rechnung' : 'Rechnungen'} jetzt generieren
            </Button>
          )}
          <Button onClick={() => { setCreating(true); setEditing(null); }}>+ Neues Abo</Button>
        </div>
      </div>

      {/* Result toast */}
      {lastGenResult && (
        <div className={`rounded-xl px-5 py-3 text-sm font-medium ${lastGenResult.generated > 0 ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-gray-50 border text-gray-500'}`}>
          {lastGenResult.generated === 0
            ? 'Keine fälligen Rechnungen.'
            : `✓ ${lastGenResult.generated} Rechnung(en) erstellt: ${lastGenResult.invoiceNumbers.join(', ')}`}
        </div>
      )}

      {creating && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Neues Abo anlegen</h3>
          <RecurringForm onSave={handleCreate} onCancel={() => setCreating(false)} />
        </div>
      )}

      {editing && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Abo bearbeiten</h3>
          <RecurringForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
        </div>
      )}

      {recurringInvoices.length === 0 && !creating ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔁</p>
          <p className="text-sm font-medium">Noch keine wiederkehrenden Rechnungen.</p>
          <p className="text-xs mt-1">Ideal für Abonnements, Retainer, monatliche Dienstleistungen.</p>
          <Button className="mt-4" onClick={() => setCreating(true)}>Erstes Abo anlegen</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {recurringInvoices.map((r) => {
            const totals = calcInvoiceTotals(r.items);
            const gross = company.smallBusiness ? totals.net : totals.gross;
            const isDue = r.active && r.nextDate <= today;
            const nextDateObj = new Date(r.nextDate);
            const daysUntil = Math.ceil((nextDateObj.getTime() - new Date().setHours(0,0,0,0)) / 86_400_000);

            return (
              <div
                key={r.id}
                className={`bg-white border rounded-xl shadow-sm overflow-hidden flex`}
              >
                {/* Left stripe: active=blue, inactive=gray, due=amber */}
                <div className={`w-1 shrink-0 ${isDue ? 'bg-amber-400' : r.active ? 'bg-blue-500' : 'bg-gray-200'}`} />

                <div className="flex-1 p-4">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800">{r.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {recurringIntervalLabel(r.interval)}
                        </span>
                        {isDue && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            ⚡ Fällig
                          </span>
                        )}
                        {!r.active && (
                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Pausiert</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {r.customer.name}{r.customer.company ? ` · ${r.customer.company}` : ''}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        <span>
                          Nächste Ausführung:{' '}
                          <span className={isDue ? 'text-amber-600 font-semibold' : 'text-gray-600 font-medium'}>
                            {formatDate(r.nextDate)}
                            {!isDue && daysUntil > 0 && ` (in ${daysUntil} ${daysUntil === 1 ? 'Tag' : 'Tagen'})`}
                          </span>
                        </span>
                        {r.lastGeneratedAt && (
                          <span>Zuletzt: {formatDate(r.lastGeneratedAt)}</span>
                        )}
                        {r.autoSendEmail && <span>📋 Auto-Erinnerung aktiv</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(gross)}</p>
                      <p className="text-xs text-gray-400">pro {recurringIntervalLabel(r.interval).toLowerCase().replace('weise', '')}</p>
                    </div>
                  </div>

                  {/* Item summary */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.items.slice(0, 3).map((it) => (
                      <span key={it.id} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                        {it.description || '–'}
                      </span>
                    ))}
                    {r.items.length > 3 && (
                      <span className="text-xs text-gray-400">+{r.items.length - 3} weitere</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 p-3 border-l border-gray-100 justify-center shrink-0">
                  <button
                    title={r.active ? 'Pausieren' : 'Aktivieren'}
                    onClick={() => toggleRecurring(r.id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${r.active ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                  >
                    {r.active ? '⏸' : '▶'}
                  </button>
                  <button
                    title="Bearbeiten"
                    onClick={() => { setEditing(r); setCreating(false); }}
                    className="w-8 h-8 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center text-sm"
                  >
                    ✎
                  </button>
                  <button
                    title="Löschen"
                    onClick={() => handleDelete(r.id)}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center text-base font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
