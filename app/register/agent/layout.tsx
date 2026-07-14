import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up as a Field Agent",
  description: "Register as a Snapect field agent in 3 minutes. Start earning by conducting property and vehicle inspections in your area, no real estate license required.",
  keywords: [
    "field agent registration", "sign up field inspector", "BPO agent signup",
    "REO inspector application", "join field inspection network"
  ],
  alternates: { canonical: "/register/agent" },
  openGraph: {
    title: "Sign Up as a Field Agent | Snapect",
    description: "Register in 3 minutes and start earning as a Snapect field agent.",
    url: "/register/agent",
  },
};

export default function RegisterAgentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
