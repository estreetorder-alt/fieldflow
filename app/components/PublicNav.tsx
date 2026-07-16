"use client";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/coverage", label: "Coverage Area" },
  { href: "/services", label: "Services" },
  { href: "/register/client", label: "New Vendor Signup", highlight: true },
  { href: "/work", label: "Join Our Team" },
  { href: "/contact", label: "Contact" },
];

export default function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#FAF6EF]/85 backdrop-blur-xl border-b border-[#E7DBCB]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center flex-shrink-0" aria-label="Snapect Home">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Image src="/snapect-logo.png" alt="Snapect" width={140} height={44} className="h-10 w-auto object-contain" priority />
            </motion.div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              if (link.highlight) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      active ? "bg-[#C2410C] text-white" : "bg-[#F3EBDD] text-[#2A2320] border border-[#E7DBCB] hover:bg-[#EADCC8]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "text-[#C2410C]" : "text-[#6B5D52] hover:text-[#C2410C]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <Link href="/login">
              <Button size="sm" className="bg-[#2A2320] text-white hover:bg-[#1C1917]">
                Login
              </Button>
            </Link>
          </div>

          <button onClick={() => setOpen(!open)} className="lg:hidden text-[#2A2320] hover:text-[#C2410C] transition-colors" aria-label="Toggle menu">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden pt-4 pb-6 space-y-3 overflow-hidden"
            >
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block transition-colors ${
                    link.highlight ? "text-[#C2410C] font-semibold" : "text-[#6B5D52] hover:text-[#C2410C]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-[#E7DBCB]">
                <Link href="/login" onClick={() => setOpen(false)}>
                  <Button className="w-full bg-[#2A2320] text-white hover:bg-[#1C1917]">Login</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
