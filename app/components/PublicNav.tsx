"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Camera, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/services", label: "Services & Pricing" },
  { href: "/coverage", label: "Coverage" },
  { href: "/work", label: "Join as Agent" },
  { href: "/contact", label: "Contact" },
];

export default function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-[#0f1f3d] border-b border-[#1a3260] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#c8991a] rounded-lg flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">FieldFlow</span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={`text-sm font-medium transition-colors ${pathname === l.href ? "text-[#f0b429]" : "text-slate-300 hover:text-white"}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-300 hover:text-white font-medium transition-colors px-3 py-1.5">
            Log in
          </Link>
          <Link href="/register/agent"
            className="text-sm text-[#0f1f3d] bg-[#c8991a] hover:bg-[#f0b429] font-bold px-4 py-2 rounded-lg transition-colors">
            Become an Agent
          </Link>
          <Link href="/register/client"
            className="text-sm text-white border border-[#1a3260] hover:border-[#c8991a] bg-[#1a3260] hover:bg-[#1a3260]/80 font-semibold px-4 py-2 rounded-lg transition-colors">
            Client Sign Up
          </Link>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-slate-300 hover:text-white">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[#1a3260] bg-[#0f1f3d] px-4 py-4 space-y-2">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${pathname === l.href ? "bg-[#1a3260] text-[#f0b429]" : "text-slate-300 hover:bg-[#1a3260] hover:text-white"}`}>
              {l.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-[#1a3260] flex flex-col gap-2">
            <Link href="/login" onClick={() => setOpen(false)}
              className="block text-center border border-slate-600 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#1a3260]">
              Log in
            </Link>
            <Link href="/register/client" onClick={() => setOpen(false)}
              className="block text-center bg-[#1a3260] border border-[#1a3260] text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
              Client Sign Up
            </Link>
            <Link href="/register/agent" onClick={() => setOpen(false)}
              className="block text-center bg-[#c8991a] text-[#0f1f3d] text-sm font-bold px-4 py-2.5 rounded-lg">
              Become a Field Agent
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
