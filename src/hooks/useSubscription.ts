import { useStore } from '../store';
import { PLANS, type PlanId } from '../types';

export function useSubscription() {
  const { subscription } = useStore();
  const planId: PlanId = subscription?.planId ?? 'free';
  const plan = PLANS[planId];
  const isActive = subscription.status === 'active' || subscription.status === 'trialing' || planId === 'free';

  const invoicesThisMonth = subscription.invoicesThisMonth ?? 0;
  const limit = plan.limits;

  function can(feature: keyof typeof plan.limits): boolean {
    if (!isActive) return false;
    const val = limit[feature];
    if (typeof val === 'boolean') return val;
    return true; // numeric limits checked separately
  }

  function withinInvoiceLimit(): boolean {
    if (limit.invoicesPerMonth === -1) return true;
    return invoicesThisMonth < limit.invoicesPerMonth;
  }

  function invoicesRemaining(): number {
    if (limit.invoicesPerMonth === -1) return Infinity;
    return Math.max(0, limit.invoicesPerMonth - invoicesThisMonth);
  }

  return {
    subscription,
    plan,
    planId,
    isActive,
    invoicesThisMonth,
    invoicesRemaining: invoicesRemaining(),
    withinInvoiceLimit,
    canUseAI: can('aiEnabled'),
    canUseRecurring: can('recurringEnabled'),
    canUseAPI: can('apiEnabled'),
    canUseTeam: limit.teamMembers > 0,
    maxProfiles: limit.profiles,
    maxTeamMembers: limit.teamMembers,
    isPro: planId === 'pro' || planId === 'business',
    isBusiness: planId === 'business',
    isFree: planId === 'free',
  };
}
