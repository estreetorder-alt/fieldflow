import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FieldFlow — Field Service Platform",
  description: "Professional field inspection and survey management platform",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
