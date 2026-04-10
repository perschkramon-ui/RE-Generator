import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useStore } from '../store';
import { calcInvoiceTotals } from '../utils/invoiceUtils';
import type { Invoice } from '../types';

interface CheckoutResult { url: string; sessionId: string }

export function usePayment() {
  const { company, setStripeCheckoutUrl } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /** Opens Stripe Checkout in a new tab and stores the URL in Firestore */
  async function openStripeCheckout(uid: string, invoice: Invoice) {
    setLoading(true); setError('');
    try {
      const fn = httpsCallable<unknown, CheckoutResult>(functions, 'createStripeCheckout');
      const result = await fn({ uid, invoiceId: invoice.id });
      setStripeCheckoutUrl(invoice.id, result.data.url, result.data.sessionId);
      window.open(result.data.url, '_blank', 'noopener');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  /** Opens an existing Stripe Checkout URL */
  function openExistingCheckout(url: string) {
    window.open(url, '_blank', 'noopener');
  }

  /** Builds a PayPal.me link for an invoice */
  function getPayPalLink(invoice: Invoice): string {
    const username = company.paypalMeUsername?.trim();
    if (!username) return '';
    const totals = calcInvoiceTotals(invoice.items);
    const amount = (company.smallBusiness ? totals.net : totals.gross).toFixed(2);
    return `https://www.paypal.me/${username}/${amount}EUR`;
  }

  /** Builds a SEPA Sofortüberweisung deeplink (opens banking app if supported) */
  function getSofortLink(invoice: Invoice): string {
    const totals = calcInvoiceTotals(invoice.items);
    const amount = (company.smallBusiness ? totals.net : totals.gross).toFixed(2);
    const ref = encodeURIComponent(invoice.invoiceNumber);
    const iban = encodeURIComponent(company.iban ?? '');
    const name = encodeURIComponent(company.name);
    // Standard payment link format (GiroCode / EPC QR compatible)
    return `https://girocode.de/?iban=${iban}&name=${name}&amount=${amount}&reference=${ref}`;
  }

  return {
    openStripeCheckout,
    openExistingCheckout,
    getPayPalLink,
    getSofortLink,
    loading,
    error,
    stripeEnabled: company.stripeEnabled,
    paypalEnabled: !!company.paypalMeUsername?.trim(),
  };
}
