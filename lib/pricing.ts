export type TurnaroundTier = "standard" | "rush_24hr" | "rush_6hr";

export function getTierLabel(tier: string): string {
  return { standard:"Next Business Day", rush_24hr:"24-Hour Rush", rush_6hr:"6-Hour Rush" }[tier] ?? tier;
}

export function getTierDescription(tier: string): string {
  return {
    standard: "Completed by next business day",
    rush_24hr: "Completed within 24 hours",
    rush_6hr: "Completed within 6 daylight hours",
  }[tier] ?? "";
}
