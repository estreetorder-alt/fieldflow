"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/",                label: "Home" },
  { href: "/coverage",        label: "Coverage Area" },
  { href: "/services",        label: "Services" },
  { href: "/register/client", label: "New Client Signup" },
  { href: "/work",            label: "Join Our Team" },
  { href: "/contact",         label: "Contact" },
];

export default function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="bg-[#1a1a2e] border-b border-[#16213e] sticky top-0 z-50 shadow-lg" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0" aria-label="Snapect Home">
            <Image src="/snapect-logo.png" alt="Snapect" width={120} height={40} className="h-10 w-auto object-contain" priority/>
          </Link>

          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  isActive(l.href) ? "text-[#f0b429] bg-[#16213e]" : "text-slate-300 hover:text-white hover:bg-[#16213e]"
                }`}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <Link href="/login" className="px-4 py-2 text-sm font-bold text-[#0f1f3d] bg-[#c8991a] hover:bg-[#f0b429] rounded-lg transition-colors whitespace-nowrap">
              Login
            </Link>
          </div>

          <button onClick={() => setOpen(!open)} className="lg:hidden text-slate-300 hover:text-white p-1" aria-label="Toggle menu">
            {open ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-[#16213e] bg-[#1a1a2e] px-4 py-3 space-y-1">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(l.href) ? "bg-[#16213e] text-[#f0b429]" : "text-slate-300 hover:bg-[#16213e] hover:text-white"
              }`}>
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[#16213e]">
            <Link href="/login" onClick={() => setOpen(false)}
              className="block text-center bg-[#c8991a] text-[#0f1f3d] font-bold px-4 py-2.5 rounded-lg text-sm mt-2">
              Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
