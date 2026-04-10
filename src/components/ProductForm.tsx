import { useForm } from 'react-hook-form';
import type { Product } from '../types';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';

const UNIT_OPTIONS = ['Stk.', 'Std.', 'Tage', 'Monat', 'pauschal', 'km', 'l', 'kg'];

type FormData = {
  name: string;
  description: string;
  unitPrice: number;
  unit: string;
  vatRate: number;
  category: string;
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
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: initial
      ? { ...initial, category: initial.category ?? '' }
      : { unit: 'Stk.', vatRate: 19, unitPrice: 0, name: '', description: '', category: '' },
  });

  function onSubmit(data: FormData) {
    if (!data.name.trim()) return;
    if (!data.description.trim()) return;
    onSave({
      name: data.name,
      description: data.description,
      unitPrice: Number(data.unitPrice),
      unit: data.unit,
      vatRate: Number(data.vatRate) as Product['vatRate'],
      category: data.category || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Kurzname / Artikel-Nr."
          required
          placeholder="z. B. Webdesign-Stunde"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Kategorie (optional)"
          placeholder="z. B. Dienstleistung"
          {...register('category')}
        />
        <div className="col-span-2">
          <Input
            label="Leistungsbeschreibung (erscheint auf Rechnung)"
            required
            placeholder="z. B. Erstellung und Gestaltung einer responsiven Website …"
            error={errors.description?.message}
            {...register('description')}
          />
        </div>
        <div className="relative">
          <Input
            label="Einzelpreis (netto)"
            required
            type="number"
            min={0}
            step="0.01"
            error={errors.unitPrice?.message}
            {...register('unitPrice', { valueAsNumber: true })}
          />
        </div>
        <Select label="Einheit" required error={errors.unit?.message} {...register('unit')}>
          {UNIT_OPTIONS.map((u) => <option key={u}>{u}</option>)}
        </Select>
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
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Abbrechen</Button>
        <Button type="submit">Speichern</Button>
      </div>
    </form>
  );
}
