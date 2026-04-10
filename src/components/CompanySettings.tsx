import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '../store';
import type { CompanySettings as CompanySettingsType } from '../types';
import { buildInvoiceNumber } from '../utils/invoiceUtils';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';

const schema = z.object({
  name: z.string().min(1, 'Pflichtfeld'),
  street: z.string().min(1, 'Pflichtfeld'),
  zip: z.string().min(4, 'Pflichtfeld'),
  city: z.string().min(1, 'Pflichtfeld'),
  country: z.string().min(1, 'Pflichtfeld'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  phone: z.string().optional(),
  website: z.string().optional(),
  taxNumber: z.string().min(1, 'Steuernummer ist Pflicht (§14 UStG)'),
  vatId: z.string().optional(),
  smallBusiness: z.boolean(),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  logoUrl: z.string().optional(),
  brandColor: z.string().min(1),
  accentColor: z.string().min(1),
  invoicePrefix: z.string().min(1, 'Pflichtfeld'),
  numberFormat: z.string().min(1, 'Pflichtfeld'),
  numberPadding: z.number().int().min(1).max(8),
  nextInvoiceNumber: z.number().int().min(1),
  defaultPaymentDays: z.number().int().min(1),
  paymentNotes: z.string().optional(),
  aiApiKey: z.string().optional(),
  aiModel: z.string().optional(),
  brevoApiKey: z.string().optional(),
  paypalMeUsername: z.string().optional(),
  stripeEnabled: z.boolean(),
  dunningAutoSend: z.boolean(),
  dunningLevels: z.array(z.object({
    level: z.number(),
    label: z.string(),
    triggerAfterDays: z.number(),
    fee: z.number(),
    interestRatePercent: z.number(),
  })),
});

type FormData = z.infer<typeof schema>;

export function CompanySettings() {
  const { company, setCompany } = useStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...company,
      brandColor: company.brandColor ?? '#1d4ed8',
      accentColor: company.accentColor ?? '#1e40af',
      stripeEnabled: company.stripeEnabled ?? false,
      paypalMeUsername: company.paypalMeUsername ?? '',
      dunningAutoSend: company.dunningAutoSend ?? true,
      dunningLevels: company.dunningLevels ?? [
        { level: 1, label: 'Zahlungserinnerung', triggerAfterDays: 3,  fee: 0,  interestRatePercent: 0 },
        { level: 2, label: '1. Mahnung',         triggerAfterDays: 14, fee: 5,  interestRatePercent: 9 },
        { level: 3, label: '2. Mahnung',         triggerAfterDays: 28, fee: 10, interestRatePercent: 9 },
        { level: 4, label: 'Letzte Mahnung',     triggerAfterDays: 45, fee: 25, interestRatePercent: 9 },
      ],
      numberFormat: company.numberFormat ?? '{PREFIX}-{YEAR}-{NUM}',
      numberPadding: company.numberPadding ?? 4,
    } as FormData,
  });

  const smallBusiness = watch('smallBusiness');
  const watchLogo = watch('logoUrl');
  const watchBrand = watch('brandColor') || '#1d4ed8';
  const watchAccent = watch('accentColor') || '#1e40af';
  const watchPrefix = watch('invoicePrefix') || 'RE';
  const watchFormat = watch('numberFormat') || '{PREFIX}-{YEAR}-{NUM}';
  const watchPadding = watch('numberPadding') || 4;
  const watchNext = watch('nextInvoiceNumber') || 1;
  const preview = buildInvoiceNumber(watchPrefix, watchNext, watchFormat, Number(watchPadding));

  function onSubmit(data: FormData) {
    setCompany(data as CompanySettingsType);
    alert('Einstellungen gespeichert.');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Absenderdaten (§14 UStG)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Name / Firmenname" required error={errors.name?.message} {...register('name')} />
          </div>
          <div className="col-span-2">
            <Input label="Straße + Hausnummer" required error={errors.street?.message} {...register('street')} />
          </div>
          <Input label="PLZ" required error={errors.zip?.message} {...register('zip')} />
          <Input label="Stadt" required error={errors.city?.message} {...register('city')} />
          <div className="col-span-2">
            <Input label="Land" required error={errors.country?.message} {...register('country')} />
          </div>
          <Input label="E-Mail" required type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Telefon" {...register('phone')} />
          <div className="col-span-2">
            <Input label="Website" {...register('website')} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Logo &amp; Branding</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Logo upload */}
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">Firmenlogo</label>
            <div className="flex items-start gap-4">
              {watchLogo && (
                <div className="relative">
                  <img src={watchLogo} alt="Logo" className="h-16 max-w-[160px] object-contain border border-gray-200 rounded-lg p-1 bg-white" />
                  <button
                    type="button"
                    onClick={() => setValue('logoUrl', '', { shouldDirty: true })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                    title="Logo entfernen"
                  >
                    ×
                  </button>
                </div>
              )}
              <label className="flex-1 cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <p className="text-sm text-gray-500">
                    {watchLogo ? 'Anderes Logo hochladen' : 'Logo hochladen'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG – max. 2 MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { alert('Datei zu groß (max. 2 MB)'); return; }
                    const reader = new FileReader();
                    reader.onload = () => setValue('logoUrl', reader.result as string, { shouldDirty: true });
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Brand colors */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Primärfarbe</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-9 w-14 rounded cursor-pointer border border-gray-300 p-0.5"
                {...register('brandColor')}
              />
              <span className="text-sm font-mono text-gray-600">{watchBrand}</span>
            </div>
            <p className="text-xs text-gray-400">Header-Balken, Linienstil</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Akzentfarbe</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-9 w-14 rounded cursor-pointer border border-gray-300 p-0.5"
                {...register('accentColor')}
              />
              <span className="text-sm font-mono text-gray-600">{watchAccent}</span>
            </div>
            <p className="text-xs text-gray-400">Gesamtbetrag-Box, Akzente</p>
          </div>

          {/* Color presets */}
          <div className="col-span-2">
            <p className="text-xs text-gray-500 mb-2">Schnellauswahl Farbschema</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Blau', brand: '#1d4ed8', accent: '#1e40af' },
                { label: 'Dunkelgrün', brand: '#15803d', accent: '#14532d' },
                { label: 'Slate', brand: '#334155', accent: '#1e293b' },
                { label: 'Violett', brand: '#7c3aed', accent: '#5b21b6' },
                { label: 'Rot', brand: '#b91c1c', accent: '#991b1b' },
                { label: 'Schwarz', brand: '#111827', accent: '#030712' },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setValue('brandColor', p.brand, { shouldDirty: true });
                    setValue('accentColor', p.accent, { shouldDirty: true });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-full text-xs hover:border-gray-400 transition-colors"
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-white/50 shadow-sm" style={{ backgroundColor: p.brand }} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Steuerliche Angaben</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Steuernummer"
              required
              placeholder="z. B. 123/456/78901"
              error={errors.taxNumber?.message}
              {...register('taxNumber')}
            />
            <p className="text-xs text-gray-500 mt-1">Pflichtangabe gem. §14 Abs. 4 Nr. 2 UStG</p>
          </div>
          <div className="col-span-2">
            <Input
              label="USt-IdNr. (optional)"
              placeholder="z. B. DE123456789"
              error={errors.vatId?.message}
              {...register('vatId')}
            />
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-blue-600" {...register('smallBusiness')} />
              <span className="text-sm font-medium text-gray-700">
                Kleinunternehmer gem. §19 UStG (keine Umsatzsteuerausweis)
              </span>
            </label>
            {smallBusiness && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Als Kleinunternehmer wird auf Rechnungen automatisch der Hinweis „Gemäß §19 UStG wird keine
                Umsatzsteuer berechnet." ergänzt.
              </p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Bankverbindung / Zahlung</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Bank / Institut" {...register('bankName')} />
          </div>
          <Input label="IBAN" placeholder="DE00 0000 0000 0000 0000 00" {...register('iban')} />
          <Input label="BIC" {...register('bic')} />
          <div className="col-span-2">
            <Textarea label="Sonstige Zahlungshinweise" placeholder="z. B. Zahlung per PayPal an …" {...register('paymentNotes')} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Rechnungsnummern</h2>
        <div className="grid grid-cols-2 gap-4">

          {/* Prefix */}
          <Input
            label="Präfix"
            placeholder="RE"
            error={errors.invoicePrefix?.message}
            {...register('invoicePrefix')}
          />

          {/* Padding */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Nullstellen <span className="text-gray-400 font-normal">(Länge der Nummer)</span>
            </label>
            <select
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('numberPadding', { valueAsNumber: true })}
            >
              <option value={2}>2 Stellen — 01</option>
              <option value={3}>3 Stellen — 001</option>
              <option value={4}>4 Stellen — 0001</option>
              <option value={5}>5 Stellen — 00001</option>
              <option value={6}>6 Stellen — 000001</option>
            </select>
          </div>

          {/* Format template */}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Format-Vorlage
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {[
                { label: 'RE-2026-0001', value: '{PREFIX}-{YEAR}-{NUM}' },
                { label: '2026-0001', value: '{YEAR}-{NUM}' },
                { label: '2026/0001', value: '{YEAR}/{NUM}' },
                { label: 'RE-04-2026-0001', value: '{PREFIX}-{MONTH}-{YEAR}-{NUM}' },
                { label: 'RE-0001', value: '{PREFIX}-{NUM}' },
                { label: '0001', value: '{NUM}' },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('numberFormat', value, { shouldDirty: true })}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    watchFormat === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <span className="font-mono">{label}</span>
                </button>
              ))}
            </div>
            <Input
              label="Eigene Vorlage (Tokens: {PREFIX}, {YEAR}, {MONTH}, {NUM})"
              placeholder="{PREFIX}-{YEAR}-{NUM}"
              error={errors.numberFormat?.message}
              {...register('numberFormat')}
            />
          </div>

          {/* Next number */}
          <Input
            label="Nächste Nummer"
            type="number"
            min={1}
            error={errors.nextInvoiceNumber?.message}
            {...register('nextInvoiceNumber', { valueAsNumber: true })}
          />

          {/* Live preview */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Vorschau</label>
            <div className="flex items-center h-[38px] px-3 bg-gray-50 border border-gray-200 rounded-md">
              <span className="font-mono text-sm text-blue-700 font-semibold">{preview}</span>
            </div>
            <p className="text-xs text-gray-400">So sieht die nächste Rechnungsnummer aus</p>
          </div>

          {/* Payment days (moved here) */}
          <div className="col-span-2">
            <Input
              label="Zahlungsziel (Tage)"
              type="number"
              min={1}
              error={errors.defaultPaymentDays?.message}
              {...register('defaultPaymentDays', { valueAsNumber: true })}
            />
          </div>
        </div>
      </section>

      <section>
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">E-Mail-Versand (Brevo)</h2>
        <p className="text-xs text-gray-400 mb-4">
          Wird für den direkten E-Mail-Versand von Rechnungen und Zahlungserinnerungen verwendet.
          Schl&uuml;ssel wird lokal gespeichert und verschl&uuml;sselt an Cloud Functions &uuml;bertragen.
        </p>
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Brevo API-Schlüssel"
            type="password"
            placeholder="xkeysib-…"
            autoComplete="off"
            {...register('brevoApiKey')}
          />
          <p className="text-xs text-gray-400">
            Brevo Console → SMTP &amp; API → API-Schl&uuml;ssel
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Mahnsystem</h2>
        <p className="text-xs text-gray-400 mb-4">
          Mahnstufen und Gebühren konfigurieren. Verzugszinsen gem. §288 BGB (aktuell 9 % p.a. über Basiszinssatz).
        </p>
        <div className="space-y-3 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_80px_80px] gap-2 items-end bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Bezeichnung</label>
                <input
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={['Zahlungserinnerung', '1. Mahnung', '2. Mahnung', 'Letzte Mahnung'][i]}
                  {...register(`dunningLevels.${i}.label` as never)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Ab Tag</label>
                <input
                  type="number" min={0}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register(`dunningLevels.${i}.triggerAfterDays` as never, { valueAsNumber: true })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Gebühr €</label>
                <input
                  type="number" min={0} step="0.01"
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register(`dunningLevels.${i}.fee` as never, { valueAsNumber: true })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Zinsen %</label>
                <input
                  type="number" min={0} step="0.1"
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register(`dunningLevels.${i}.interestRatePercent` as never, { valueAsNumber: true })}
                />
              </div>
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-blue-600" {...register('dunningAutoSend')} />
          <span className="text-sm text-gray-700">Mahnbrief automatisch in Zwischenablage kopieren</span>
        </label>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Online-Zahlungen</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-blue-600" {...register('stripeEnabled')} />
              <span className="text-sm font-medium text-gray-700">
                Stripe aktivieren (Karte, SOFORT, Klarna, SEPA)
              </span>
            </label>
            <p className="text-xs text-gray-400 mt-1">
              Stripe Secret Key serverseitig setzen: <code className="bg-gray-100 px-1 rounded">firebase functions:secrets:set STRIPE_SECRET_KEY</code>
            </p>
          </div>
          <div className="col-span-2">
            <Input
              label="PayPal.me Benutzername"
              placeholder="z. B. maxmustermann"
              {...register('paypalMeUsername')}
            />
            <p className="text-xs text-gray-400 mt-1">Erzeugt Links: paypal.me/benutzername/betragEUR</p>
          </div>
        </div>
      </section>

        <h2 className="text-lg font-semibold text-gray-800 mb-1">KI-Assistent</h2>
        <p className="text-xs text-gray-400 mb-4">
          Dein API-Schlüssel wird ausschließlich lokal im Browser gespeichert und nie an unsere Server übertragen.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="OpenAI API-Schlüssel"
              type="password"
              placeholder="sk-…"
              autoComplete="off"
              {...register('aiApiKey')}
            />
            <p className="text-xs text-gray-400 mt-1">
              Erhalte deinen Schlüssel auf{' '}
              <span className="text-blue-500">platform.openai.com/api-keys</span>
            </p>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">KI-Modell</label>
            <select
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('aiModel')}
            >
              <option value="gpt-4o-mini">gpt-4o-mini (schnell, günstig)</option>
              <option value="gpt-4o">gpt-4o (besser, teurer)</option>
              <option value="gpt-4-turbo">gpt-4-turbo</option>
            </select>
          </div>
        </div>
      </section>

      <Button type="submit" disabled={!isDirty}>
        Einstellungen speichern
      </Button>
    </form>
  );
}
