import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useStore } from '../store';
import { PLANS, type PlanId } from '../types';


const PLAN_ORDER: PlanId[] = ['free', 'pro', 'business'];

const PLAN_COLORS: Record<PlanId, string> = {
  free:     'border-gray-200',
  pro:      'border-blue-500 ring-2 ring-blue-200',
  business: 'border-purple-500 ring-2 ring-purple-200',
};

const PLAN_BADGE: Record<PlanId, string | null> = {
  free:     null,
  pro:      'Beliebt',
  business: 'Power-User',
};

export function PricingPage() {
  const { user } = useAuth();
  const { plan: currentPlan, planId: currentPlanId, subscription } = useSubscription();
  useStore();
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');

  const appUrl = window.location.origin;

  async function handleUpgrade(planId: PlanId) {
    if (!user) return;
    const plan = PLANS[planId];
    if (!plan.stripePriceId || plan.stripePriceId.startsWith('price_REPLACE')) {
      setError('Stripe Price ID noch nicht konfiguriert. Bitte zuerst in Stripe Dashboard anlegen.');
      return;
    }
    setLoading(planId);
    setError('');
    try {
      const fn = httpsCallable<unknown, { url: string }>(functions, 'createSubscriptionCheckout');
      const result = await fn({
        uid: user.uid,
        email: user.email,
        priceId: plan.stripePriceId,
        successUrl: `${appUrl}?subscription=success`,
        cancelUrl: `${appUrl}?subscription=cancelled`,
      });
      window.location.href = result.data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    if (!user) return;
    setPortalLoading(true);
    setError('');
    try {
      const fn = httpsCallable<unknown, { url: string }>(functions, 'createCustomerPortalSession');
      const result = await fn({ uid: user.uid, returnUrl: appUrl });
      window.location.href = result.data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Abonnement</h2>
        <p className="text-gray-500 mt-2">
          Aktueller Plan: <span className="font-semibold text-blue-600">{currentPlan.name}</span>
          {subscription.currentPeriodEnd && (
            <span className="text-gray-400 text-sm ml-2">
              · läuft bis {new Date(subscription.currentPeriodEnd).toLocaleDateString('de-DE')}
            </span>
          )}
          {subscription.cancelAtPeriodEnd && (
            <span className="text-amber-600 text-sm ml-2">· wird nicht verlängert</span>
          )}
        </p>
      </div>

      {/* Manage subscription */}
      {currentPlanId !== 'free' && subscription.stripeCustomerId && (
        <div className="text-center">
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {portalLoading ? 'Lädt …' : '⚙️ Abonnement verwalten (Kündigen, Zahlungsmethode, Rechnungen)'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pricing cards */}
      <div className="grid grid-cols-3 gap-5">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = currentPlanId === planId;
          const badge = PLAN_BADGE[planId];

          return (
            <div
              key={planId}
              className={`bg-white rounded-2xl border p-6 flex flex-col relative ${PLAN_COLORS[planId]}`}
            >
              {badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white ${planId === 'pro' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                  {badge}
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-black text-gray-900">Kostenlos</span>
                  ) : (
                    <>
                      <span className="text-3xl font-black text-gray-900">
                        {plan.price.toFixed(2).replace('.', ',')} €
                      </span>
                      <span className="text-gray-400 text-sm">/Monat</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full text-center py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-500">
                  Aktueller Plan
                </div>
              ) : planId === 'free' ? (
                <div className="w-full text-center py-2.5 rounded-xl text-sm font-semibold bg-gray-50 text-gray-400 border border-gray-200">
                  Downgrade über Portal
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(planId)}
                  disabled={loading === planId}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                    planId === 'pro' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {loading === planId ? 'Weiterleitung …' : `Auf ${plan.name} upgraden`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature comparison */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Alle Features im Vergleich</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="pb-2 text-gray-500 font-medium">Feature</th>
                {PLAN_ORDER.map((p) => (
                  <th key={p} className={`pb-2 text-center font-semibold ${p === currentPlanId ? 'text-blue-600' : 'text-gray-700'}`}>
                    {PLANS[p].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { label: 'Rechnungen/Monat', key: (p: PlanId) => PLANS[p].limits.invoicesPerMonth === -1 ? '∞' : String(PLANS[p].limits.invoicesPerMonth) },
                { label: 'Kunden', key: (p: PlanId) => PLANS[p].limits.customers === -1 ? '∞' : String(PLANS[p].limits.customers) },
                { label: 'Firmenprofile', key: (p: PlanId) => PLANS[p].limits.profiles === -1 ? '∞' : String(PLANS[p].limits.profiles) },
                { label: 'Teammitglieder', key: (p: PlanId) => PLANS[p].limits.teamMembers === 0 ? '—' : String(PLANS[p].limits.teamMembers) },
                { label: 'KI-Assistent', key: (p: PlanId) => PLANS[p].limits.aiEnabled ? '✓' : '—' },
                { label: 'Wiederkehrende Rechnungen', key: (p: PlanId) => PLANS[p].limits.recurringEnabled ? '✓' : '—' },
                { label: 'REST API', key: (p: PlanId) => PLANS[p].limits.apiEnabled ? '✓' : '—' },
                { label: 'DATEV/CSV Export', key: (p: PlanId) => PLANS[p].limits.exportEnabled ? '✓' : '—' },
              ].map(({ label, key }) => (
                <tr key={label}>
                  <td className="py-2.5 text-gray-600">{label}</td>
                  {PLAN_ORDER.map((p) => (
                    <td key={p} className={`py-2.5 text-center font-medium ${key(p) === '✓' ? 'text-green-600' : key(p) === '—' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {key(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Alle Preise inkl. MwSt. · Monatlich kündbar · Sichere Zahlung via Stripe
      </p>
    </div>
  );
}

/** Small inline upgrade prompt for gated features */
export function UpgradePrompt({ feature, requiredPlan = 'pro' }: { feature: string; requiredPlan?: PlanId }) {
  const plan = PLANS[requiredPlan];
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-5 text-center space-y-3">
      <p className="text-2xl">🔒</p>
      <p className="font-semibold text-gray-800">{feature} ist im {plan.name}-Plan verfügbar</p>
      <p className="text-sm text-gray-500">Ab {plan.price.toFixed(2).replace('.', ',')} €/Monat</p>
      <a
        href="?tab=subscription"
        onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('open-subscription')); }}
        className="inline-block bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
      >
        Jetzt upgraden
      </a>
    </div>
  );
}
