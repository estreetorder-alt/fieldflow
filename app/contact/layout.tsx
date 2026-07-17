import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Snapect for BPO and REO field inspection services, field agent support, or general inquiries. Fast response times.",
  keywords: ["contact Snapect", "BPO inspection support", "field inspection company contact"],
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Snapect",
    description: "Get in touch for BPO and REO field inspection services or field agent support.",
    url: "/contact",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
