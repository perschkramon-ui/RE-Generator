import { useForm } from 'react-hook-form';
import type { Product } from '../types';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';

const UNIT_OPTIONS = ['Stk.', 'm', 'Rolle', 'Pkg.', 'Sack', 'Eimer', 'Std.', 'Tage', 'Monat', 'pauschal', 'km', 'l', 'kg'];

type FormData = {
  name: string;
  description: string;
  unitPrice: number;
  purchasePrice: number;
  unit: string;
  vatRate: number;
  category: string;
  articleNumber: string;
  trackStock: boolean;
  stock: number;
  minStock: number;
};

interface Props {
  initial?: Product;
  onSave: (data: Omit<Product, 'id'>) => void;
  onCancel: () => void;
}

export function ProductForm({ initial, onSave, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: initial
      ? {
          ...initial,
          category: initial.category ?? '',
          articleNumber: initial.articleNumber ?? '',
          purchasePrice: initial.purchasePrice ?? 0,
          trackStock: initial.trackStock ?? false,
          stock: initial.stock ?? 0,
          minStock: initial.minStock ?? 0,
        }
      : {
          unit: 'Stk.',
          vatRate: 19,
          unitPrice: 0,
          purchasePrice: 0,
          name: '',
          description: '',
          category: '',
          articleNumber: '',
          trackStock: false,
          stock: 0,
          minStock: 0,
        },
  });

  const trackStock = watch('trackStock');

  function onSubmit(data: FormData) {
    if (!data.name.trim()) return;
    if (!data.description.trim()) return;
    onSave({
      name: data.name,
      description: data.description,
      unitPrice: Number(data.unitPrice),
      purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : undefined,
      unit: data.unit,
      vatRate: Number(data.vatRate) as Product['vatRate'],
      category: data.category || undefined,
      articleNumber: data.articleNumber || undefined,
      trackStock: data.trackStock,
      stock: data.trackStock ? Number(data.stock) : undefined,
      minStock: data.trackStock ? Number(data.minStock) : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Basis-Informationen */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Artikelname / Kurzbezeichnung"
          required
          placeholder="z. B. NYM-J 3x1,5mm²"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Artikelnummer (optional)"
          placeholder="z. B. NYM3x1.5 / EAN"
          {...register('articleNumber')}
        />
        <div className="col-span-2">
          <Input
            label="Rechnungstext (erscheint auf Rechnung)"
            required
            placeholder="z. B. Feuchtraumkabel NYM-J 3x1,5mm², grau"
            error={errors.description?.message}
            {...register('description')}
          />
        </div>
        <Input
          label="Kategorie (optional)"
          placeholder="z. B. Leitungen & Kabel"
          {...register('category')}
        />
        <Select label="Einheit" required error={errors.unit?.message} {...register('unit')}>
          {UNIT_OPTIONS.map((u) => <option key={u}>{u}</option>)}
        </Select>
      </div>

      {/* Preise */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Preise</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="relative">
            <Input
              label="Einzelpreis netto (Verkauf)"
              required
              type="number"
              min={0}
              step="0.01"
              error={errors.unitPrice?.message}
              {...register('unitPrice', { valueAsNumber: true })}
            />
          </div>
          <div className="relative">
            <Input
              label="Einkaufspreis netto (intern)"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              {...register('purchasePrice', { valueAsNumber: true })}
            />
          </div>
          <Select
            label="Mehrwertsteuer"
            required
            error={errors.vatRate?.message}
            {...register('vatRate')}
          >
            <option value={19}>19 % (Regelsteuersatz)</option>
            <option value={7}>7 % (ermäßigt)</option>
            <option value={0}>0 % (steuerfrei)</option>
          </Select>
        </div>
      </div>

      {/* Lagerbestand */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lagerbestand</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded"
              {...register('trackStock')}
            />
            <span className="text-sm text-gray-700 font-medium">Bestand verfolgen</span>
          </label>
        </div>
        {trackStock && (
          <div className="grid grid-cols-2 gap-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <Input
              label="Aktueller Bestand"
              type="number"
              min={0}
              step="any"
              placeholder="0"
              {...register('stock', { valueAsNumber: true })}
            />
            <Input
              label="Mindestbestand (Nachbestellgrenze)"
              type="number"
              min={0}
              step="any"
              placeholder="0"
              {...register('minStock', { valueAsNumber: true })}
            />
            <p className="col-span-2 text-xs text-blue-600">
              ⚠ Liegt der Bestand unter dem Mindestbestand, erscheint der Artikel in der Nachbestellliste.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Abbrechen</Button>
        <Button type="submit">Speichern</Button>
      </div>
    </form>
  );
}
