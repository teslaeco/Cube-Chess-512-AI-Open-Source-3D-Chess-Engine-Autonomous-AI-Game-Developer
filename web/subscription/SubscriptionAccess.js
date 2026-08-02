export const SUBSCRIPTION_PLANS = Object.freeze({
  FREE: "free",
  PREMIUM_MONTHLY: "premium_monthly",
  PREMIUM_YEARLY: "premium_yearly",
  SUPPORTER: "supporter",
});

export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: "active",
  TRIALING: "trialing",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  INCOMPLETE: "incomplete",
  EXPIRED: "expired",
});

export const PREMIUM_FEATURES = Object.freeze({
  REMOVE_ADS: "remove_ads",
  ADVANCED_AI: "advanced_ai",
  GAME_ANALYSIS: "game_analysis",
  CLOUD_HISTORY: "cloud_history",
  PREMIUM_THEMES: "premium_themes",
  PRIVATE_TOURNAMENTS: "private_tournaments",
});

const PREMIUM_PLANS = new Set([
  SUBSCRIPTION_PLANS.PREMIUM_MONTHLY,
  SUBSCRIPTION_PLANS.PREMIUM_YEARLY,
  SUBSCRIPTION_PLANS.SUPPORTER,
]);

const ENTITLED_STATUSES = new Set([
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.TRIALING,
]);

export function normalizeSubscription(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      plan: SUBSCRIPTION_PLANS.FREE,
      status: SUBSCRIPTION_STATUS.EXPIRED,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  const periodEnd = raw.currentPeriodEnd ?? raw.current_period_end ?? null;
  return {
    plan: Object.values(SUBSCRIPTION_PLANS).includes(raw.plan)
      ? raw.plan
      : SUBSCRIPTION_PLANS.FREE,
    status: Object.values(SUBSCRIPTION_STATUS).includes(raw.status)
      ? raw.status
      : SUBSCRIPTION_STATUS.EXPIRED,
    currentPeriodEnd: periodEnd ? new Date(periodEnd).toISOString() : null,
    cancelAtPeriodEnd: Boolean(raw.cancelAtPeriodEnd ?? raw.cancel_at_period_end),
  };
}

export function hasPremiumAccess(subscription, now = new Date()) {
  const normalized = normalizeSubscription(subscription);
  if (!PREMIUM_PLANS.has(normalized.plan)) return false;
  if (!ENTITLED_STATUSES.has(normalized.status)) return false;
  if (!normalized.currentPeriodEnd) return true;
  return new Date(normalized.currentPeriodEnd).getTime() > now.getTime();
}

export function canUseFeature(subscription, feature, now = new Date()) {
  if (!Object.values(PREMIUM_FEATURES).includes(feature)) return false;
  return hasPremiumAccess(subscription, now);
}

export function subscriptionLabel(subscription, language = "en") {
  const normalized = normalizeSubscription(subscription);
  const labels = {
    en: {
      free: "Free",
      premium_monthly: "Premium Monthly",
      premium_yearly: "Premium Yearly",
      supporter: "Supporter",
    },
    pl: {
      free: "Darmowy",
      premium_monthly: "Premium miesięczne",
      premium_yearly: "Premium roczne",
      supporter: "Wspierający",
    },
  };
  return (labels[language] ?? labels.en)[normalized.plan] ?? labels.en.free;
}
