/**
 * The shapes the settings and billing screens read.
 *
 * Prices come from the API rather than the bundle, so an old build can never
 * quote the wrong number at the moment of payment.
 */

export interface PlanOption {
  code: string;
  name: string;
  badge: string | null;
  priceInPaise: number;
  priceLabel: string;
  interval: string;
  intervalLabel: string;
  maxChildren: number;
  sessionsPerDay: number;
  features: string[];
  isCurrent: boolean;
  supportsCurrentChildren: boolean;
}

export interface SubscriptionState {
  current: {
    planCode: string;
    planName: string;
    status: string;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    cancelledAt: string | null;
  };
  childCount: number;
  plans: PlanOption[];
  /** False when the server has no Razorpay keys — checkout cannot be offered. */
  paymentsConfigured: boolean;
}
