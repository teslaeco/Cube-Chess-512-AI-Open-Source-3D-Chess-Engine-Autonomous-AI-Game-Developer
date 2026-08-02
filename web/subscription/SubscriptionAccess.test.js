import { describe, expect, it } from "vitest";
import {
  PREMIUM_FEATURES,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS,
  canUseFeature,
  hasPremiumAccess,
  normalizeSubscription,
  subscriptionLabel,
} from "./SubscriptionAccess.js";

const now = new Date("2026-08-02T20:00:00.000Z");

function active(overrides = {}) {
  return {
    plan: SUBSCRIPTION_PLANS.PREMIUM_MONTHLY,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    currentPeriodEnd: "2026-09-02T20:00:00.000Z",
    ...overrides,
  };
}

describe("premium subscription access", () => {
  it("keeps missing subscription data on the free tier", () => {
    expect(normalizeSubscription(null)).toEqual({
      plan: SUBSCRIPTION_PLANS.FREE,
      status: SUBSCRIPTION_STATUS.EXPIRED,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  });

  it.each([
    SUBSCRIPTION_PLANS.PREMIUM_MONTHLY,
    SUBSCRIPTION_PLANS.PREMIUM_YEARLY,
    SUBSCRIPTION_PLANS.SUPPORTER,
  ])("grants access to an active %s plan", (plan) => {
    expect(hasPremiumAccess(active({ plan }), now)).toBe(true);
  });

  it("keeps access until the end of a canceled billing period", () => {
    expect(hasPremiumAccess(active({ cancelAtPeriodEnd: true }), now)).toBe(true);
  });

  it.each([
    SUBSCRIPTION_STATUS.PAST_DUE,
    SUBSCRIPTION_STATUS.CANCELED,
    SUBSCRIPTION_STATUS.INCOMPLETE,
    SUBSCRIPTION_STATUS.EXPIRED,
  ])("denies access for %s status", (status) => {
    expect(hasPremiumAccess(active({ status }), now)).toBe(false);
  });

  it("denies access after the paid period expires", () => {
    expect(hasPremiumAccess(active({ currentPeriodEnd: "2026-08-01T20:00:00.000Z" }), now))
      .toBe(false);
  });

  it("gates known premium features and rejects unknown feature names", () => {
    expect(canUseFeature(active(), PREMIUM_FEATURES.ADVANCED_AI, now)).toBe(true);
    expect(canUseFeature(active(), "developer_console", now)).toBe(false);
  });

  it("provides Polish and English labels", () => {
    expect(subscriptionLabel(active(), "pl")).toBe("Premium miesięczne");
    expect(subscriptionLabel(active(), "en")).toBe("Premium Monthly");
  });
});
