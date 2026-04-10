/**
 * Firestore service — wraps all CRUD operations.
 * Data model (single-user): /users/{uid}/{collection}/{docId}
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  CompanySettings,
  Customer,
  Invoice,
  Product,
  RecurringInvoice,
} from '../types';

// ── Collection path helpers ───────────────────────────────────────────────────

const root = (uid: string) => `users/${uid}`;
const col = (uid: string, name: string) => collection(db, root(uid), name);
const settingsDoc = (uid: string) => doc(db, root(uid), 'settings', 'company');

// ── Company Settings ─────────────────────────────────────────────────────────

export async function saveCompany(uid: string, data: CompanySettings) {
  await setDoc(settingsDoc(uid), data);
}

export async function loadCompany(uid: string): Promise<CompanySettings | null> {
  const snap = await getDoc(settingsDoc(uid));
  return snap.exists() ? (snap.data() as CompanySettings) : null;
}

// ── Generic CRUD factory ──────────────────────────────────────────────────────

type DocWithId = { id: string };

async function loadAll<T extends DocWithId>(uid: string, name: string): Promise<T[]> {
  const snap = await getDocs(col(uid, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

async function saveDoc<T extends DocWithId>(uid: string, name: string, item: T) {
  await setDoc(doc(db, root(uid), name, item.id), item);
}

async function removeDoc(uid: string, name: string, id: string) {
  await deleteDoc(doc(db, root(uid), name, id));
}

function subscribeCollection<T extends DocWithId>(
  uid: string,
  name: string,
  onData: (items: T[]) => void
): Unsubscribe {
  return onSnapshot(col(uid, name), (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
  });
}

// ── Customers ─────────────────────────────────────────────────────────────────
export const loadCustomers = (uid: string) => loadAll<Customer>(uid, 'customers');
export const saveCustomer = (uid: string, c: Customer) => saveDoc(uid, 'customers', c);
export const deleteCustomer = (uid: string, id: string) => removeDoc(uid, 'customers', id);
export const subscribeCustomers = (uid: string, cb: (c: Customer[]) => void) =>
  subscribeCollection<Customer>(uid, 'customers', cb);

// ── Invoices ──────────────────────────────────────────────────────────────────
export const loadInvoices = (uid: string) => loadAll<Invoice>(uid, 'invoices');
export const saveInvoice = (uid: string, inv: Invoice) => saveDoc(uid, 'invoices', inv);
export const deleteInvoice = (uid: string, id: string) => removeDoc(uid, 'invoices', id);
export const subscribeInvoices = (uid: string, cb: (inv: Invoice[]) => void) =>
  subscribeCollection<Invoice>(uid, 'invoices', cb);

// ── Products ──────────────────────────────────────────────────────────────────
export const loadProducts = (uid: string) => loadAll<Product>(uid, 'products');
export const saveProduct = (uid: string, p: Product) => saveDoc(uid, 'products', p);
export const deleteProduct = (uid: string, id: string) => removeDoc(uid, 'products', id);
export const subscribeProducts = (uid: string, cb: (p: Product[]) => void) =>
  subscribeCollection<Product>(uid, 'products', cb);

// ── Recurring Invoices ────────────────────────────────────────────────────────
export const loadRecurring = (uid: string) => loadAll<RecurringInvoice>(uid, 'recurring');
export const saveRecurring = (uid: string, r: RecurringInvoice) => saveDoc(uid, 'recurring', r);
export const deleteRecurring = (uid: string, id: string) => removeDoc(uid, 'recurring', id);
export const subscribeRecurring = (uid: string, cb: (r: RecurringInvoice[]) => void) =>
  subscribeCollection<RecurringInvoice>(uid, 'recurring', cb);

// ── Batch write (for recurring invoice generation) ────────────────────────────
export async function batchWriteInvoicesAndRecurring(
  uid: string,
  newInvoices: Invoice[],
  updatedRecurring: RecurringInvoice[]
) {
  const batch = writeBatch(db);
  for (const inv of newInvoices) {
    batch.set(doc(db, root(uid), 'invoices', inv.id), inv);
  }
  for (const r of updatedRecurring) {
    batch.set(doc(db, root(uid), 'recurring', r.id), r);
  }
  await batch.commit();
}
