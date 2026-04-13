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
  CompanyProfile,
  Customer,
  Invoice,
  Product,
  RecurringInvoice,
  TeamMember,
  TeamRole,
  ApiKey,
  Subscription,
} from '../types';

// ── Collection path helpers ───────────────────────────────────────────────────

const root = (uid: string) => `users/${uid}`;
const col = (uid: string, name: string) => collection(db, root(uid), name);
const settingsDoc = (uid: string) => doc(db, root(uid), 'settings', 'company');
const activeProfileDoc = (uid: string) => doc(db, root(uid), 'settings', 'activeProfile');

// ── Company Profiles ──────────────────────────────────────────────────────────

export async function loadProfiles(uid: string): Promise<CompanyProfile[]> {
  const snap = await getDocs(col(uid, 'profiles'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CompanyProfile));
}

export async function saveProfile(uid: string, profile: CompanyProfile) {
  await setDoc(doc(db, root(uid), 'profiles', profile.id), profile);
}

export async function deleteProfile(uid: string, id: string) {
  await deleteDoc(doc(db, root(uid), 'profiles', id));
}

export async function loadActiveProfileId(uid: string): Promise<string | null> {
  const snap = await getDoc(activeProfileDoc(uid));
  return snap.exists() ? (snap.data() as { id: string }).id : null;
}

export async function saveActiveProfileId(uid: string, profileId: string) {
  await setDoc(activeProfileDoc(uid), { id: profileId });
}

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

// ── Subscription ─────────────────────────────────────────────────────────────
const subscriptionDoc = (uid: string) => doc(db, root(uid), 'settings', 'subscription');

export async function loadSubscription(uid: string): Promise<Subscription | null> {
  const snap = await getDoc(subscriptionDoc(uid));
  return snap.exists() ? (snap.data() as Subscription) : null;
}

export async function saveSubscription(uid: string, sub: Subscription) {
  await setDoc(subscriptionDoc(uid), sub);
}

// ── API Keys ──────────────────────────────────────────────────────────────────
export const loadApiKeys = (uid: string) => loadAll<ApiKey>(uid, 'apiKeys');
export const saveApiKey = (uid: string, key: ApiKey) => saveDoc(uid, 'apiKeys', key);
export const deleteApiKey = (uid: string, id: string) => removeDoc(uid, 'apiKeys', id);

// ── Team Members ──────────────────────────────────────────────────────────────
export const loadTeamMembers = (uid: string) => loadAll<TeamMember>(uid, 'team');
export const saveTeamMember = (uid: string, m: TeamMember) => saveDoc(uid, 'team', m);
export const deleteTeamMember = (uid: string, id: string) => removeDoc(uid, 'team', id);
export const subscribeTeam = (uid: string, cb: (m: TeamMember[]) => void) =>
  subscribeCollection<TeamMember>(uid, 'team', cb);

/** Lookup which owner account a user belongs to (stored under invitee's uid) */
export async function findOwnerUidForUser(userUid: string): Promise<{ ownerUid: string; role: TeamRole } | null> {
  const { getDocs: gd, collectionGroup } = await import('firebase/firestore');
  try {
    const snap = await gd(collectionGroup(db, 'team'));
    const found = snap.docs.find((d) => d.data().uid === userUid && d.data().status === 'active');
    if (!found) return null;
    const data = found.data() as TeamMember;
    return { ownerUid: data.ownerUid, role: data.role };
  } catch {
    return null;
  }
}

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
