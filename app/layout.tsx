import type { Metadata } from "next";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://snapect.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Snapect — BPO & REO Field Inspection Photography | 45+ Services",
    template: "%s | Snapect"
  },
  description: "Snapect is America's trusted BPO and REO field inspection photography platform. 45+ services including exterior photo sets, vehicle inspections, occupancy checks, and videography. Verified local agents in 35 states. Orders dispatched within seconds.",
  keywords: [
    "BPO photography", "REO inspection photos", "field inspection service",
    "property photography", "occupancy check", "vehicle inspection",
    "BPO photo set", "REO photography service", "field agent network",
    "property condition report", "exterior photo set", "real estate inspection",
    "bpo photoflow", "field inspection platform", "property documentation"
  ],
  authors: [{ name: "Snapect" }],
  creator: "Snapect",
  publisher: "Snapect",
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Snapect",
    title: "Snapect — BPO & REO Field Inspection Photography | 45+ Services",
    description: "America's trusted BPO and REO field inspection photography platform. 45+ services, verified agents in 35 states, orders dispatched within seconds.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Snapect — Field Inspection Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Snapect — BPO & REO Field Inspection Photography",
    description: "45+ services · Verified agents in 35 states · Orders dispatched within seconds",
    images: ["/og-image.jpg"],
  },
  alternates: { canonical: BASE_URL },
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/favicon.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || "",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Snapect",
              "url": BASE_URL,
              "logo": `${BASE_URL}/snapect-logo.png`,
              "description": "America's trusted BPO and REO field inspection photography platform.",
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+1-941-723-3200",
                "contactType": "customer service",
                "availableLanguage": "English"
              },
              "sameAs": [],
              "areaServed": "US",
              "serviceType": "Field Inspection Photography"
            })
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
