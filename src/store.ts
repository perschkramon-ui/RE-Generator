import { create } from 'zustand';
import type { CompanySettings, CompanyProfile, Customer, Invoice, InvoiceStatus, Product, RecurringInvoice, TeamMember, TeamRole, ApiKey, Subscription } from './types';
import { buildInvoiceNumber, advanceByInterval, addDays, todayIso } from './utils/invoiceUtils';
import * as fs from './services/firestoreService';

// uid of the logged-in user — set by App on auth state change
let _uid = '';
export function setStoreUid(uid: string) { _uid = uid; }

interface AppState {
  company: CompanySettings;       // active profile (derived)
  profiles: CompanyProfile[];     // all profiles
  activeProfileId: string | null;
  addProfile: (profile: CompanyProfile) => Promise<void>;
  updateProfile: (profile: CompanyProfile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  switchProfile: (id: string) => Promise<void>;
  customers: Customer[];
  invoices: Invoice[];
  products: Product[];
  setCompany: (settings: CompanySettings) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  markPaid: (id: string) => void;
  markReminderSent: (id: string) => void;
  setStripeCheckoutUrl: (id: string, url: string, sessionId: string) => void;
  recordDunning: (id: string, level: number, fee: number, method: 'clipboard' | 'email') => void;
  getNextInvoiceNumber: () => string;
  incrementInvoiceNumber: () => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  recurringInvoices: RecurringInvoice[];
  addRecurring: (r: RecurringInvoice) => void;
  updateRecurring: (r: RecurringInvoice) => void;
  deleteRecurring: (id: string) => void;
  toggleRecurring: (id: string) => void;
  generateDueInvoices: () => { generated: number; invoiceNumbers: string[] };
  // Team
  teamMembers: TeamMember[];
  addTeamMember: (member: TeamMember) => Promise<void>;
  updateTeamMemberRole: (uid: string, role: TeamRole) => Promise<void>;
  removeTeamMember: (uid: string) => Promise<void>;
  // Subscription
  subscription: Subscription;
  setSubscription: (sub: Subscription) => void;
  incrementInvoiceCount: () => void;
  // API Keys
  apiKeys: ApiKey[];
  addApiKey: (key: ApiKey) => void;
  revokeApiKeyLocal: (id: string) => void;
  removeApiKey: (id: string) => Promise<void>;
  // Firestore sync
  loadFromFirestore: (uid: string) => Promise<void>;
  isLoaded: boolean;
}

const DEFAULT_COMPANY: CompanySettings = {
  name: '',
  street: '',
  zip: '',
  city: '',
  country: 'Deutschland',
  email: '',
  phone: '',
  website: '',
  taxNumber: '',
  vatId: '',
  smallBusiness: false,
  bankName: '',
  iban: '',
  bic: '',
  logoUrl: '',
  brandColor: '#1d4ed8',
  accentColor: '#1e40af',
  invoicePrefix: 'RE',
  numberFormat: '{PREFIX}-{YEAR}-{NUM}',
  numberPadding: 4,
  nextInvoiceNumber: 1,
  defaultPaymentDays: 14,
  paymentNotes: '',
  aiApiKey: '',
  aiModel: 'gpt-4o-mini',
  brevoApiKey: '',
  paypalMeUsername: '',
  stripeEnabled: false,
  dunningAutoSend: true,
  dunningLevels: [
    { level: 1, label: 'Zahlungserinnerung', triggerAfterDays: 3,  fee: 0,   interestRatePercent: 0 },
    { level: 2, label: '1. Mahnung',         triggerAfterDays: 14, fee: 5,   interestRatePercent: 9 },
    { level: 3, label: '2. Mahnung',         triggerAfterDays: 28, fee: 10,  interestRatePercent: 9 },
    { level: 4, label: 'Letzte Mahnung',     triggerAfterDays: 45, fee: 25,  interestRatePercent: 9 },
  ],
};

export const useStore = create<AppState>()((set, get) => ({
  company: DEFAULT_COMPANY,
  profiles: [],
  activeProfileId: null,
  teamMembers: [],
  subscription: { planId: 'free', status: 'free' },
  apiKeys: [],
  customers: [],
  invoices: [],
  products: [],
  recurringInvoices: [],
  isLoaded: false,

  // ── Firestore bootstrap ────────────────────────────────────────────────────
  loadFromFirestore: async (uid: string) => {
    setStoreUid(uid);
    const [legacyCompany, customers, invoices, products, recurringInvoices, profiles, activeProfileId, teamMembers, apiKeys, subscription] =
      await Promise.all([
        fs.loadCompany(uid),
        fs.loadCustomers(uid),
        fs.loadInvoices(uid),
        fs.loadProducts(uid),
        fs.loadRecurring(uid),
        fs.loadProfiles(uid),
        fs.loadActiveProfileId(uid),
        fs.loadTeamMembers(uid),
        fs.loadApiKeys(uid),
        fs.loadSubscription(uid),
      ]);

    let resolvedProfiles = profiles;
    let resolvedActiveId = activeProfileId;

    // Migrate legacy single-company settings to profile system on first load
    if (resolvedProfiles.length === 0 && legacyCompany && legacyCompany.name) {
      const defaultProfile: CompanyProfile = {
        ...legacyCompany,
        id: crypto.randomUUID(),
        profileName: legacyCompany.name || 'Hauptprofil',
        createdAt: new Date().toISOString(),
      };
      await fs.saveProfile(uid, defaultProfile);
      await fs.saveActiveProfileId(uid, defaultProfile.id);
      resolvedProfiles = [defaultProfile];
      resolvedActiveId = defaultProfile.id;
    }

    const activeProfile = resolvedProfiles.find((p) => p.id === resolvedActiveId)
      ?? resolvedProfiles[0]
      ?? null;

    set({
      company: activeProfile ?? legacyCompany ?? DEFAULT_COMPANY,
      profiles: resolvedProfiles,
      activeProfileId: resolvedActiveId ?? resolvedProfiles[0]?.id ?? null,
      teamMembers,
      subscription: subscription ?? { planId: 'free', status: 'free' },
      apiKeys,
      customers,
      invoices,
      products,
      recurringInvoices,
      isLoaded: true,
    });
  },

  // ── Profile management ────────────────────────────────────────────────────
  addProfile: async (profile) => {
    set((s) => ({ profiles: [...s.profiles, profile] }));
    if (_uid) {
      await fs.saveProfile(_uid, profile);
      if (get().profiles.length === 1) {
        await fs.saveActiveProfileId(_uid, profile.id);
        set({ activeProfileId: profile.id, company: profile });
      }
    }
  },

  updateProfile: async (profile) => {
    set((s) => ({
      profiles: s.profiles.map((p) => (p.id === profile.id ? profile : p)),
      company: s.activeProfileId === profile.id ? profile : s.company,
    }));
    if (_uid) await fs.saveProfile(_uid, profile);
  },

  deleteProfile: async (id) => {
    const remaining = get().profiles.filter((p) => p.id !== id);
    const newActive = remaining[0] ?? null;
    set((s) => ({
      profiles: remaining,
      activeProfileId: s.activeProfileId === id ? (newActive?.id ?? null) : s.activeProfileId,
      company: s.activeProfileId === id ? (newActive ?? DEFAULT_COMPANY) : s.company,
    }));
    if (_uid) {
      await fs.deleteProfile(_uid, id);
      if (newActive) await fs.saveActiveProfileId(_uid, newActive.id);
    }
  },

  switchProfile: async (id) => {
    const profile = get().profiles.find((p) => p.id === id);
    if (!profile) return;
    set({ activeProfileId: id, company: profile });
    if (_uid) await fs.saveActiveProfileId(_uid, id);
  },

  // ── Subscription ─────────────────────────────────────────────────────────
  setSubscription: (sub) => {
    set({ subscription: sub });
    if (_uid) fs.saveSubscription(_uid, sub);
  },
  incrementInvoiceCount: () => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const { subscription } = get();
    const reset = subscription.invoicesMonthKey !== monthKey;
    const updated: Subscription = {
      ...subscription,
      invoicesThisMonth: reset ? 1 : (subscription.invoicesThisMonth ?? 0) + 1,
      invoicesMonthKey: monthKey,
    };
    set({ subscription: updated });
    if (_uid) fs.saveSubscription(_uid, updated);
  },

  // ── API Keys ─────────────────────────────────────────────────────────────
  addApiKey: (key) => {
    set((s) => ({ apiKeys: [...s.apiKeys, key] }));
    if (_uid) fs.saveApiKey(_uid, key);
  },
  revokeApiKeyLocal: (id) => {
    set((s) => ({ apiKeys: s.apiKeys.map((k) => k.id === id ? { ...k, active: false } : k) }));
    const key = get().apiKeys.find((k) => k.id === id);
    if (_uid && key) fs.saveApiKey(_uid, { ...key, active: false });
  },
  removeApiKey: async (id) => {
    set((s) => ({ apiKeys: s.apiKeys.filter((k) => k.id !== id) }));
    if (_uid) await fs.deleteApiKey(_uid, id);
  },

  // ── Team ─────────────────────────────────────────────────────────────────
  addTeamMember: async (member) => {
    set((s) => ({ teamMembers: [...s.teamMembers, member] }));
    if (_uid) await fs.saveTeamMember(_uid, member);
  },
  updateTeamMemberRole: async (uid, role) => {
    set((s) => ({
      teamMembers: s.teamMembers.map((m) => (m.uid === uid || m.email === uid) ? { ...m, role } : m),
    }));
    const member = get().teamMembers.find((m) => m.uid === uid || m.email === uid);
    if (_uid && member) await fs.saveTeamMember(_uid, { ...member, role });
  },
  removeTeamMember: async (uid) => {
    const member = get().teamMembers.find((m) => m.uid === uid || m.email === uid);
    set((s) => ({ teamMembers: s.teamMembers.filter((m) => m.uid !== uid && m.email !== uid) }));
    if (_uid && member) await fs.deleteTeamMember(_uid, member.uid || member.email);
  },

  // ── Company (saves to active profile) ────────────────────────────────────
  setCompany: (settings) => {
    const { activeProfileId, profiles } = get();
    set({ company: settings });
    if (_uid) {
      fs.saveCompany(_uid, settings);
      // Also update the active profile if one exists
      if (activeProfileId) {
        const profile = profiles.find((p) => p.id === activeProfileId);
        if (profile) {
          const updated: CompanyProfile = { ...settings, id: profile.id, profileName: profile.profileName, createdAt: profile.createdAt };
          set((s) => ({ profiles: s.profiles.map((p) => p.id === updated.id ? updated : p) }));
          fs.saveProfile(_uid, updated);
        }
      }
    }
  },

  // ── Customers ─────────────────────────────────────────────────────────────
  addCustomer: (customer) => {
    set((s) => ({ customers: [...s.customers, customer] }));
    if (_uid) fs.saveCustomer(_uid, customer);
  },
  updateCustomer: (customer) => {
    set((s) => ({ customers: s.customers.map((c) => (c.id === customer.id ? customer : c)) }));
    if (_uid) fs.saveCustomer(_uid, customer);
  },
  deleteCustomer: (id) => {
    set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
    if (_uid) fs.deleteCustomer(_uid, id);
  },

  // ── Invoices ──────────────────────────────────────────────────────────────
  addInvoice: (invoice) => {
    set((s) => ({ invoices: [...s.invoices, invoice] }));
    if (_uid) fs.saveInvoice(_uid, invoice);
  },
  updateInvoice: (invoice) => {
    set((s) => ({ invoices: s.invoices.map((inv) => (inv.id === invoice.id ? invoice : inv)) }));
    if (_uid) fs.saveInvoice(_uid, invoice);
  },
  deleteInvoice: (id) => {
    set((s) => ({ invoices: s.invoices.filter((inv) => inv.id !== id) }));
    if (_uid) fs.deleteInvoice(_uid, id);
  },
  updateInvoiceStatus: (id, status) => {
    set((s) => ({
      invoices: s.invoices.map((inv) => (inv.id === id ? { ...inv, status } : inv)),
    }));
    const inv = get().invoices.find((i) => i.id === id);
    if (_uid && inv) fs.saveInvoice(_uid, { ...inv, status });
  },
  markPaid: (id) => {
    const paidAt = new Date().toISOString().slice(0, 10);
    set((s) => ({
      invoices: s.invoices.map((inv) =>
        inv.id === id ? { ...inv, status: 'paid', paidAt } : inv
      ),
    }));
    const inv = get().invoices.find((i) => i.id === id);
    if (_uid && inv) fs.saveInvoice(_uid, { ...inv, status: 'paid', paidAt });
  },
  markReminderSent: (id) => {
    const reminderSentAt = new Date().toISOString().slice(0, 10);
    set((s) => ({
      invoices: s.invoices.map((inv) =>
        inv.id === id ? { ...inv, reminderSentAt, status: 'sent' } : inv
      ),
    }));
    const inv = get().invoices.find((i) => i.id === id);
    if (_uid && inv) fs.saveInvoice(_uid, { ...inv, reminderSentAt, status: 'sent' });
  },

  setStripeCheckoutUrl: (id, url, sessionId) => {
    set((s) => ({
      invoices: s.invoices.map((inv) =>
        inv.id === id ? { ...inv, stripeCheckoutUrl: url, stripeSessionId: sessionId } : inv
      ),
    }));
    const inv = get().invoices.find((i) => i.id === id);
    if (_uid && inv) fs.saveInvoice(_uid, { ...inv, stripeCheckoutUrl: url, stripeSessionId: sessionId });
  },

  recordDunning: (id, level, fee, method) => {
    const sentAt = new Date().toISOString().slice(0, 10);
    const entry = { level, sentAt, fee, method };
    set((s) => ({
      invoices: s.invoices.map((inv) => {
        if (inv.id !== id) return inv;
        return {
          ...inv,
          dunningLevel: level,
          reminderSentAt: sentAt,
          status: inv.status === 'draft' ? 'sent' : inv.status,
          dunningHistory: [...(inv.dunningHistory ?? []), entry],
        };
      }),
    }));
    const inv = get().invoices.find((i) => i.id === id);
    if (_uid && inv) fs.saveInvoice(_uid, inv);
  },

  getNextInvoiceNumber: () => {
    const { company } = get();
    return buildInvoiceNumber(
      company.invoicePrefix,
      company.nextInvoiceNumber,
      company.numberFormat,
      company.numberPadding
    );
  },
  incrementInvoiceNumber: () => {
    const next = get().company.nextInvoiceNumber + 1;
    set((s) => ({ company: { ...s.company, nextInvoiceNumber: next } }));
    if (_uid) fs.saveCompany(_uid, { ...get().company, nextInvoiceNumber: next });
  },

  // ── Products ──────────────────────────────────────────────────────────────
  addProduct: (product) => {
    set((s) => ({ products: [...s.products, product] }));
    if (_uid) fs.saveProduct(_uid, product);
  },
  updateProduct: (product) => {
    set((s) => ({ products: s.products.map((p) => (p.id === product.id ? product : p)) }));
    if (_uid) fs.saveProduct(_uid, product);
  },
  deleteProduct: (id) => {
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
    if (_uid) fs.deleteProduct(_uid, id);
  },

  // ── Recurring ─────────────────────────────────────────────────────────────
  addRecurring: (r) => {
    set((s) => ({ recurringInvoices: [...s.recurringInvoices, r] }));
    if (_uid) fs.saveRecurring(_uid, r);
  },
  updateRecurring: (r) => {
    set((s) => ({ recurringInvoices: s.recurringInvoices.map((ri) => (ri.id === r.id ? r : ri)) }));
    if (_uid) fs.saveRecurring(_uid, r);
  },
  deleteRecurring: (id) => {
    set((s) => ({ recurringInvoices: s.recurringInvoices.filter((r) => r.id !== id) }));
    if (_uid) fs.deleteRecurring(_uid, id);
  },
  toggleRecurring: (id) => {
    set((s) => ({
      recurringInvoices: s.recurringInvoices.map((r) =>
        r.id === id ? { ...r, active: !r.active } : r
      ),
    }));
    const r = get().recurringInvoices.find((ri) => ri.id === id);
    if (_uid && r) fs.saveRecurring(_uid, r);
  },

  generateDueInvoices: () => {
    const { company, recurringInvoices } = get();
    const today = todayIso();
    const generated: string[] = [];
    const updatedRecurring = [...recurringInvoices];
    const newInvoices: Invoice[] = [];
    let nextNum = company.nextInvoiceNumber;

    for (let i = 0; i < updatedRecurring.length; i++) {
      const r = updatedRecurring[i];
      if (!r.active || r.nextDate > today) continue;

      const invNum = buildInvoiceNumber(company.invoicePrefix, nextNum, company.numberFormat, company.numberPadding);
      nextNum++;

      const invoice: Invoice = {
        id: crypto.randomUUID(),
        invoiceNumber: invNum,
        date: today,
        serviceDate: today,
        dueDate: addDays(today, company.defaultPaymentDays),
        customer: r.customer,
        items: r.items.map((it) => ({ ...it, id: crypto.randomUUID() })),
        notes: r.notes,
        status: 'draft',
        createdAt: new Date().toISOString(),
      };
      newInvoices.push(invoice);
      generated.push(invNum);
      updatedRecurring[i] = {
        ...r,
        lastGeneratedAt: today,
        nextDate: advanceByInterval(r.nextDate, r.interval, r.dayOfMonth),
      };
    }

    if (generated.length > 0) {
      const updatedCompany = { ...company, nextInvoiceNumber: nextNum };
      set((s) => ({
        invoices: [...s.invoices, ...newInvoices],
        recurringInvoices: updatedRecurring,
        company: updatedCompany,
      }));
      if (_uid) {
        fs.batchWriteInvoicesAndRecurring(_uid, newInvoices, updatedRecurring);
        fs.saveCompany(_uid, updatedCompany);
      }
    }
    return { generated: generated.length, invoiceNumbers: generated };
  },
}));
