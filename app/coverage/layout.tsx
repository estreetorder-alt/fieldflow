import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coverage Area — Check Your ZIP Code",
  description: "Check if Snapect's verified field agent network covers your area. BPO and REO inspection coverage across 35+ states, with priority routing for local agents.",
  keywords: [
    "BPO inspection coverage area", "REO inspection by state", "field agent coverage map",
    "property inspection near me", "zip code coverage check", "local field inspection service"
  ],
  alternates: { canonical: "/coverage" },
  openGraph: {
    title: "Coverage Area — Check Your ZIP Code | Snapect",
    description: "Check if Snapect's field agent network covers your area. Coverage across 35+ states.",
    url: "/coverage",
  },
};

export default function CoverageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
