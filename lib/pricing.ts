import { store } from "./store";
import type { TurnaroundTier } from "./store";

const TIER_MULTIPLIERS: Record<TurnaroundTier, number> = {
  standard: 1.0,
  rush_24hr: 1.25,
  rush_6hr: 1.75,
};

const AGENT_CUT: Record<TurnaroundTier, number> = {
  standard: 0.60,
  rush_24hr: 0.62,
  rush_6hr: 0.65,
};

export function calculatePrice(serviceType: string, turnaroundTier: TurnaroundTier = "standard"): number {
  const config = store.pricingConfig.find((p) => p.serviceType === serviceType && p.active);
  if (!config) return 0;
  return Math.round(config.basePrice * TIER_MULTIPLIERS[turnaroundTier]);
}

export function calculateCompensation(totalPrice: number, turnaroundTier: TurnaroundTier = "standard"): number {
  return Math.round(totalPrice * AGENT_CUT[turnaroundTier]);
}

export function getTierLabel(tier: TurnaroundTier): string {
  return { standard: "Next Business Day", rush_24hr: "24-Hour Rush", rush_6hr: "6-Hour Rush" }[tier];
}

export function getTierDescription(tier: TurnaroundTier): string {
  return {
    standard: "Completed by next business day",
    rush_24hr: "Completed within 24 hours",
    rush_6hr: "Completed within 6 daylight hours",
  }[tier];
}
