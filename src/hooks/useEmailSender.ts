/**
 * Hook for calling Cloud Functions to send emails via Brevo.
 * Requires Firebase Auth to be logged in.
 */
import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

interface SendResult { success: boolean }

export function useEmailSender() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function sendInvoice(uid: string, invoiceId: string, pdfBase64?: string) {
    setSending(true); setError(''); setSent(false);
    try {
      const fn = httpsCallable<unknown, SendResult>(functions, 'sendInvoiceEmail');
      await fn({ uid, invoiceId, pdfBase64 });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  async function sendReminder(uid: string, invoiceId: string) {
    setSending(true); setError(''); setSent(false);
    try {
      const fn = httpsCallable<unknown, SendResult>(functions, 'sendReminderEmail');
      await fn({ uid, invoiceId });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  return { sendInvoice, sendReminder, sending, error, sent };
}
