"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Camera, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/coverage", label: "Coverage" },
  { href: "/work", label: "Work With Us" },
  { href: "/contact", label: "Contact" },
];

export default function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-xl text-slate-900">FieldFlow</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={`text-sm font-medium transition-colors ${pathname===l.href?"text-blue-700":"text-slate-600 hover:text-slate-900"}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/register/agent" className="text-sm text-emerald-700 hover:text-emerald-800 font-semibold transition-colors border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg">
            Become an Agent
          </Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
            Log in
          </Link>
          <Link href="/register/client" className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            Get Started
          </Link>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-slate-500 hover:text-slate-700">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-2">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname===l.href?"bg-blue-50 text-blue-700":"text-slate-600 hover:bg-slate-50"}`}>
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <Link href="/login" onClick={() => setOpen(false)}
              className="block text-center border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
              Log in
            </Link>
            <Link href="/register/client" onClick={() => setOpen(false)}
              className="block text-center bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
              Sign Up as Client
            </Link>
            <Link href="/register/agent" onClick={() => setOpen(false)}
              className="block text-center border border-emerald-600 text-emerald-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-50 transition-colors">
              Become a Field Agent
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
