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
  { href: "/register/client", label: "New Vendor Signup" },
  { href: "/work",            label: "Join Our Team" },
  { href: "/contact",         label: "Contact" },
];

export default function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center flex-shrink-0" aria-label="Snapect Home">
            <Image src="/snapect-logo.png" alt="Snapect" width={140} height={44} className="h-11 w-auto object-contain" priority/>
          </Link>
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  isActive(l.href)
                    ? "text-[#0f1f3d] bg-[#c8991a]/10 font-bold"
                    : "text-slate-600 hover:text-[#0f1f3d] hover:bg-slate-100"
                }`}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <Link href="/login" className="px-5 py-2 text-sm font-bold text-white bg-[#0f1f3d] hover:bg-[#1a3260] rounded-lg transition-colors whitespace-nowrap">
              Login
            </Link>
          </div>
          <button onClick={() => setOpen(!open)} className="lg:hidden text-slate-600 hover:text-slate-900 p-1" aria-label="Toggle menu">
            {open ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(l.href) ? "bg-[#c8991a]/10 text-[#0f1f3d] font-bold" : "text-slate-600 hover:bg-slate-100"
              }`}>
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-100">
            <Link href="/login" onClick={() => setOpen(false)}
              className="block text-center bg-[#0f1f3d] text-white font-bold px-4 py-2.5 rounded-lg text-sm mt-2">
              Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
