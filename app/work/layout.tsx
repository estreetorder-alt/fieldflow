import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Field Agent — Earn As Much As You Can",
  description: "Join Snapect's field agent network. Conduct property and vehicle inspections in your area, no real estate license required. Flexible hours, paid every Friday via PayPal.",
  keywords: [
    "field agent jobs", "BPO field agent", "REO inspector jobs", "property inspection jobs near me",
    "field inspection gig work", "vehicle inspection jobs", "independent contractor inspection jobs",
    "become a field inspector", "flexible inspection work"
  ],
  alternates: { canonical: "/work" },
  openGraph: {
    title: "Become a Field Agent — Earn As Much As You Can | Snapect",
    description: "Conduct property and vehicle inspections in your area. No real estate license required. Flexible hours, paid every Friday.",
    url: "/work",
  },
};

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
