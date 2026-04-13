// ── Subscription / Plans ─────────────────────────────────────────────────────

export type PlanId = 'free' | 'pro' | 'business';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;          // EUR/month
  stripePriceId: string;  // set after creating in Stripe Dashboard
  features: string[];
  limits: {
    invoicesPerMonth: number;   // -1 = unlimited
    customers: number;          // -1 = unlimited
    profiles: number;
    teamMembers: number;
    aiEnabled: boolean;
    recurringEnabled: boolean;
    apiEnabled: boolean;
    exportEnabled: boolean;
  };
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    stripePriceId: '',
    features: ['3 Rechnungen/Monat', '10 Kunden', 'PDF-Export', '1 Firmenprofil'],
    limits: { invoicesPerMonth: 3, customers: 10, profiles: 1, teamMembers: 0, aiEnabled: false, recurringEnabled: false, apiEnabled: false, exportEnabled: true },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 9.90,
    stripePriceId: 'price_REPLACE_WITH_STRIPE_PRICE_ID_PRO',
    features: ['Unbegrenzte Rechnungen', 'Unbegrenzte Kunden', 'KI-Assistent', 'Wiederkehrende Rechnungen', 'Mahnsystem', 'DATEV-Export', '3 Firmenprofile'],
    limits: { invoicesPerMonth: -1, customers: -1, profiles: 3, teamMembers: 2, aiEnabled: true, recurringEnabled: true, apiEnabled: false, exportEnabled: true },
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 24.90,
    stripePriceId: 'price_REPLACE_WITH_STRIPE_PRICE_ID_BUSINESS',
    features: ['Alles aus Pro', 'Unbegrenzte Firmenprofile', 'Team-Zugänge (5 Nutzer)', 'REST API-Zugriff', 'Stripe-Zahlungslinks', 'Prioritäts-Support'],
    limits: { invoicesPerMonth: -1, customers: -1, profiles: -1, teamMembers: 5, aiEnabled: true, recurringEnabled: true, apiEnabled: true, exportEnabled: true },
  },
};

export interface Subscription {
  planId: PlanId;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'free';
  currentPeriodEnd?: string;   // ISO date
  cancelAtPeriodEnd?: boolean;
  invoicesThisMonth?: number;  // counter reset monthly
  invoicesMonthKey?: string;   // YYYY-MM for reset detection
}

// ── API Keys ─────────────────────────────────────────────────────────────────

export type ApiKeyScope = 'invoices:read' | 'invoices:write' | 'customers:read' | 'customers:write' | 'products:read';

export interface ApiKey {
  id: string;
  name: string;             // Human label, e.g. "Zapier Integration"
  keyHash: string;          // SHA-256 hash — the plain key is shown only once at creation
  keyPrefix: string;        // First 8 chars for display, e.g. "rgk_a1b2"
  scopes: ApiKeyScope[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;       // ISO date, optional
  active: boolean;
}

// ── Team & Permissions ────────────────────────────────────────────────────────

export type TeamRole = 'owner' | 'admin' | 'accountant' | 'viewer';

/** What each role can do */
export const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  owner:      ['invoices:read', 'invoices:write', 'invoices:delete', 'invoices:export',
                'customers:read', 'customers:write', 'customers:delete',
                'products:read', 'products:write',
                'settings:read', 'settings:write',
                'team:read', 'team:write',
                'recurring:read', 'recurring:write'],
  admin:      ['invoices:read', 'invoices:write', 'invoices:delete', 'invoices:export',
                'customers:read', 'customers:write', 'customers:delete',
                'products:read', 'products:write',
                'settings:read',
                'team:read',
                'recurring:read', 'recurring:write'],
  accountant: ['invoices:read', 'invoices:export',
                'customers:read',
                'products:read',
                'settings:read',
                'recurring:read'],
  viewer:     ['invoices:read',
                'customers:read',
                'products:read'],
};

export type Permission =
  | 'invoices:read' | 'invoices:write' | 'invoices:delete' | 'invoices:export'
  | 'customers:read' | 'customers:write' | 'customers:delete'
  | 'products:read' | 'products:write'
  | 'settings:read' | 'settings:write'
  | 'team:read' | 'team:write'
  | 'recurring:read' | 'recurring:write';

export interface TeamMember {
  id: string;           // Firestore doc id (= email until accepted, then uid)
  uid: string;          // Firebase Auth UID (empty until accepted)
  email: string;
  displayName?: string;
  role: TeamRole;
  status: 'pending' | 'active' | 'disabled';
  invitedAt: string;    // ISO date
  acceptedAt?: string;  // ISO date
  invitedBy: string;    // uid of inviter
  ownerUid: string;     // uid of the account owner (data lives under their uid)
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner:      'Eigentümer',
  admin:      'Administrator',
  accountant: 'Buchhalter',
  viewer:     'Betrachter',
};

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner:      'Voller Zugriff + Teamverwaltung',
  admin:      'Rechnungen + Kunden + Produkte, keine Teamverwaltung',
  accountant: 'Rechnungen lesen & exportieren, Kunden lesen',
  viewer:     'Nur lesen, kein Export',
};

// ── VatRate ───────────────────────────────────────────────────────────────────

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

/** A named company profile — CompanySettings + id + display name */
export interface CompanyProfile extends CompanySettings {
  id: string;
  profileName: string; // z.B. "Freelance Design", "Consulting GmbH"
  createdAt: string;
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
  paypalMeUsername?: string; // z.B. "meinname" → paypal.me/meinname
  stripeEnabled: boolean;   // Stripe Checkout aktivieren
  dunningLevels: DunningLevel[];  // Konfigurierbares Mahnsystem
  dunningAutoSend: boolean; // Automatisch Mahntexte in Zwischenablage kopieren
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
  paidAt?: string;           // ISO date – Zahlungseingang
  reminderSentAt?: string;   // ISO date – letzte Mahnung (legacy, kept for compat)
  dunningLevel?: number;     // 0 = keine, 1 = Erinnerung, 2 = 1. Mahnung, 3 = 2. Mahnung, 4 = letzte Mahnung
  dunningHistory?: DunningEntry[];
  stripeCheckoutUrl?: string;// Stripe Checkout URL für Kunde
  stripeSessionId?: string;  // Stripe Session ID für Webhook-Matching
  paymentMethod?: 'stripe' | 'paypal' | 'bank' | 'cash' | 'other';
  createdAt: string;
}

export interface DunningEntry {
  level: number;
  sentAt: string;           // ISO date
  fee: number;              // Mahngebühr in EUR
  method: 'clipboard' | 'email';
}

export interface DunningLevel {
  level: number;            // 1-4
  label: string;            // z.B. "1. Mahnung"
  triggerAfterDays: number; // Tage nach Fälligkeit
  fee: number;              // Mahngebühr in EUR
  interestRatePercent: number; // Verzugszinssatz p.a. (§288 BGB: 9% über Basiszins)
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
