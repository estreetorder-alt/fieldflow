import type { Metadata } from "next";
import { Inter, Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import SmoothScroll from "./components/SmoothScroll";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://snapect.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Snapect — BPO & REO Field Inspection Photography",
    template: "%s | Snapect"
  },
  description: "Snapect is America's trusted BPO and REO field inspection photography platform. Exterior photo sets, vehicle inspections, occupancy checks, and videography. Verified local agents in 35 states. Orders dispatched within seconds.",
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
    title: "Snapect — BPO & REO Field Inspection Photography",
    description: "America's trusted BPO and REO field inspection photography platform. Verified agents in 35 states, orders dispatched within seconds.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Snapect — Field Inspection Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Snapect — BPO & REO Field Inspection Photography",
    description: "Verified agents in 35 states · Orders dispatched within seconds",
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
                "email": "info@snapect.com",
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
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${plusJakarta.variable} font-sans antialiased`} suppressHydrationWarning>
        <SmoothScroll />
        {children}
        {/* Tawk.to live chat widget — loads site-wide, after the page is interactive */}
        <Script id="tawk-to-widget" strategy="afterInteractive">
          {`
            var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
            (function () {
              var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
              s1.async = true;
              s1.src = 'https://embed.tawk.to/6a775e71d702231d4ea99397/1jvh4hr4r';
              s1.charset = 'UTF-8';
              s1.setAttribute('crossorigin', '*');
              s0.parentNode.insertBefore(s1, s0);
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
