import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up as a Client",
  description: "Create a Snapect client account to order BPO and REO field inspections, photo sets, and property documentation. Orders dispatched within seconds.",
  keywords: [
    "order BPO photos", "REO inspection signup", "client account property inspection",
    "order property inspection online", "BPO photography client signup"
  ],
  alternates: { canonical: "/register/client" },
  openGraph: {
    title: "Sign Up as a Client | Snapect",
    description: "Order BPO and REO field inspections and photo sets. Orders dispatched within seconds.",
    url: "/register/client",
  },
};

export default function RegisterClientLayout({ children }: { children: React.ReactNode }) {
  return children;
}
