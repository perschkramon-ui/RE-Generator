import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Customer } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

const schema = z.object({
  name: z.string().min(1, 'Pflichtfeld'),
  company: z.string().optional(),
  street: z.string().min(1, 'Pflichtfeld'),
  zip: z.string().min(4, 'Pflichtfeld'),
  city: z.string().min(1, 'Pflichtfeld'),
  country: z.string().min(1, 'Pflichtfeld'),
  email: z.string().email('Ungültige E-Mail').optional().or(z.literal('')),
  taxId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initial?: Customer;
  onSave: (data: Omit<Customer, 'id'>) => void;
  onCancel: () => void;
}

export function CustomerForm({ initial, onSave, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { country: 'Deutschland' },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Vor- / Nachname" required error={errors.name?.message} {...register('name')} />
        <Input label="Firma (optional)" {...register('company')} />
        <div className="col-span-2">
          <Input label="Straße + Hausnummer" required error={errors.street?.message} {...register('street')} />
        </div>
        <Input label="PLZ" required error={errors.zip?.message} {...register('zip')} />
        <Input label="Stadt" required error={errors.city?.message} {...register('city')} />
        <div className="col-span-2">
          <Input label="Land" required error={errors.country?.message} {...register('country')} />
        </div>
        <Input label="E-Mail" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="USt-IdNr. des Kunden (B2B)" placeholder="DE123456789" {...register('taxId')} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Abbrechen</Button>
        <Button type="submit">Speichern</Button>
      </div>
    </form>
  );
}
