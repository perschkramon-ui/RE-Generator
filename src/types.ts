export type VatRate = 0 | 7 | 19;

export interface Product {
  id: string;
  name: string;           // Kurzname / Artikel-Nr.
  description: string;    // Leistungsbeschreibung auf der Rechnung
  unitPrice: number;
  unit: string;
  vatRate: VatRate;
  category?: string;      // optional: Dienstleistung, Software, Material …
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;         // Einheit (Stk, Std, pauschal, …)
  unitPrice: number;
  vatRate: VatRate;
}

export interface Customer {
  id: string;
  name: string;
  company?: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  email?: string;
  taxId?: string;       // USt-IdNr. des Kunden (B2B)
}

export interface CompanySettings {
  name: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  email: string;
  phone?: string;
  website?: string;
  taxNumber: string;    // Steuernummer gem. §14 UStG
  vatId?: string;       // USt-IdNr. (optional)
  smallBusiness: boolean; // §19 UStG Kleinunternehmer
  bankName?: string;
  iban?: string;
  bic?: string;
  logoUrl?: string;        // base64 data-URL
  brandColor: string;       // Primärfarbe für Header/Akzente, z. B. "#1d4ed8"
  accentColor: string;      // Akzentfarbe für Gesamtbetrag-Box, z. B. "#2563eb"
  invoicePrefix: string;
  numberFormat: string;   // Template, z. B. "{PREFIX}-{YEAR}-{NUM}" oder "{YEAR}/{NUM}"
  numberPadding: number;  // Nullstellen, z. B. 3 → 001, 4 → 0001
  nextInvoiceNumber: number;
  defaultPaymentDays: number;
  paymentNotes?: string; // z.B. "Zahlung per PayPal an …"
  aiApiKey?: string;       // OpenAI API-Schlüssel (clientseitig, nur lokal gespeichert)
  aiModel?: string;        // z.B. "gpt-4o-mini"
  brevoApiKey?: string;    // Brevo API-Schlüssel für E-Mail-Versand
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;           // ISO date – Rechnungsdatum
  serviceDate: string;    // ISO date – Leistungsdatum (§14 Abs.4 Nr.6 UStG)
  serviceDateEnd?: string;// optional: Leistungszeitraum Ende
  dueDate: string;        // ISO date – Fälligkeitsdatum
  customer: Customer;
  items: LineItem[];
  notes?: string;
  status: InvoiceStatus;
  paidAt?: string;        // ISO date – Zahlungseingang
  reminderSentAt?: string;// ISO date – letzte Mahnung
  createdAt: string;
}

export interface InvoiceTotals {
  net: number;
  vatAmounts: Record<number, number>; // vatRate -> amount
  gross: number;
}

export type RecurringInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringInvoice {
  id: string;
  name: string;                // Bezeichnung, z. B. "Monatsabo Webhosting"
  active: boolean;
  interval: RecurringInterval;
  dayOfMonth: number;          // 1–28: Tag im Monat, an dem generiert wird
  customer: Customer;
  items: LineItem[];
  notes?: string;
  nextDate: string;            // ISO date – nächste Fälligkeit
  lastGeneratedAt?: string;    // ISO date
  createdAt: string;
  // For email auto-send simulation
  autoSendEmail: boolean;      // Erinnerungstext automatisch kopieren
}
