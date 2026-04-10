import { create } from 'zustand';
import type { CompanySettings, Customer, Invoice, InvoiceStatus, Product, RecurringInvoice } from './types';
import { buildInvoiceNumber, advanceByInterval, addDays, todayIso } from './utils/invoiceUtils';
import * as fs from './services/firestoreService';

// uid of the logged-in user — set by App on auth state change
let _uid = '';
export function setStoreUid(uid: string) { _uid = uid; }

interface AppState {
  company: CompanySettings;
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
};

export const useStore = create<AppState>()((set, get) => ({
  company: DEFAULT_COMPANY,
  customers: [],
  invoices: [],
  products: [],
  recurringInvoices: [],
  isLoaded: false,

  // ── Firestore bootstrap ────────────────────────────────────────────────────
  loadFromFirestore: async (uid: string) => {
    setStoreUid(uid);
    const [company, customers, invoices, products, recurringInvoices] = await Promise.all([
      fs.loadCompany(uid),
      fs.loadCustomers(uid),
      fs.loadInvoices(uid),
      fs.loadProducts(uid),
      fs.loadRecurring(uid),
    ]);
    set({
      company: company ?? DEFAULT_COMPANY,
      customers,
      invoices,
      products,
      recurringInvoices,
      isLoaded: true,
    });
  },

  // ── Company ────────────────────────────────────────────────────────────────
  setCompany: (settings) => {
    set({ company: settings });
    if (_uid) fs.saveCompany(_uid, settings);
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
