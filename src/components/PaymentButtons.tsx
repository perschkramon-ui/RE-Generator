import { useAuth } from '../context/AuthContext';
import { usePayment } from '../hooks/usePayment';
import type { Invoice } from '../types';
import { formatCurrency, calcInvoiceTotals } from '../utils/invoiceUtils';
import { useStore } from '../store';

interface Props {
  invoice: Invoice;
  onPaid?: () => void;
}

export function PaymentButtons({ invoice }: Props) {
  const { user } = useAuth();
  const { company } = useStore();
  const {
    openStripeCheckout,
    openExistingCheckout,
    getPayPalLink,
    loading,
    error,
    stripeEnabled,
    paypalEnabled,
  } = usePayment();

  const totals = calcInvoiceTotals(invoice.items);
  const gross = company.smallBusiness ? totals.net : totals.gross;
  const paypalLink = getPayPalLink(invoice);

  // Nothing to show if no payment methods configured
  if (!stripeEnabled && !paypalEnabled) return null;

  // Already paid — show badge
  if (invoice.status === 'paid') {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm font-medium">
        <span>✓</span> Bezahlt{invoice.paidAt ? ` am ${new Date(invoice.paidAt).toLocaleDateString('de-DE')}` : ''} 
        {invoice.paymentMethod && <span className="text-xs text-green-500 ml-1">via {invoice.paymentMethod}</span>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Zahlung {formatCurrency(gross)}</p>

      <div className="flex flex-wrap gap-2">
        {/* Stripe — Card / SOFORT / SEPA / Klarna */}
        {stripeEnabled && (
          <>
            {invoice.stripeCheckoutUrl ? (
              // Existing session — reuse
              <button
                onClick={() => openExistingCheckout(invoice.stripeCheckoutUrl!)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#635BFF] hover:bg-[#4E44E0] text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.91 5.517c1.6 1.088 4.33 2.058 7.353 2.058 2.898 0 5.071-.68 6.647-2.03 1.637-1.42 2.455-3.423 2.455-5.647 0-4.145-2.554-5.867-6.453-7.204z"/>
                </svg>
                Stripe Checkout öffnen
              </button>
            ) : (
              <button
                onClick={() => user && openStripeCheckout(user.uid, invoice)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#635BFF] hover:bg-[#4E44E0] disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.91 5.517c1.6 1.088 4.33 2.058 7.353 2.058 2.898 0 5.071-.68 6.647-2.03 1.637-1.42 2.455-3.423 2.455-5.647 0-4.145-2.554-5.867-6.453-7.204z"/>
                </svg>
                {loading ? 'Erstelle Link …' : 'Stripe: Karte / SOFORT / Klarna'}
              </button>
            )}
          </>
        )}

        {/* PayPal */}
        {paypalEnabled && (
          <a
            href={paypalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#003087] hover:bg-[#002070] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.144 19.532l1.049-5.751c.11-.604.65-1.048 1.265-1.048h2.971c3.918 0 6.978-2.088 7.712-6.158.08-.427.12-.845.12-1.248C20.261 2.047 17.46 0 13.285 0H5.517C4.902 0 4.362.444 4.252 1.048L1.03 18.944c-.083.454.268.872.728.872h3.857l1.529-8.4-.133.731.133-.731z"/>
            </svg>
            PayPal.me
          </a>
        )}

        {/* Copy payment link */}
        {invoice.stripeCheckoutUrl && (
          <button
            onClick={() => navigator.clipboard.writeText(invoice.stripeCheckoutUrl!)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            title="Zahlungslink kopieren und an Kunden senden"
          >
            🔗 Link kopieren
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <p className="text-xs text-gray-400">
        Stripe: Zahlung wird automatisch bestätigt. PayPal: manuell als bezahlt markieren.
      </p>
    </div>
  );
}
