"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home, Wallet, Package, BarChart3, FileText, MapPin, CreditCard,
  Headset, Settings, Crown, Bell, ChevronDown, ArrowUpRight, LogOut,
} from "lucide-react";

export type ClientNavKey =
  | "dashboard" | "wallet" | "orders" | "reports" | "invoices"
  | "addresses" | "payment-methods" | "support" | "settings";

interface NavItem {
  key: ClientNavKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  soon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: Home, href: "/client" },
  { key: "wallet", label: "Billing & Wallet", icon: Wallet, href: "/client/wallet" },
  { key: "orders", label: "Orders", icon: Package, href: "/client" },
  { key: "reports", label: "Reports", icon: BarChart3, href: "#", soon: true },
  { key: "invoices", label: "Invoices", icon: FileText, href: "#", soon: true },
  { key: "addresses", label: "Addresses", icon: MapPin, href: "#", soon: true },
  { key: "payment-methods", label: "Payment Methods", icon: CreditCard, href: "/client/wallet#payment-card" },
  { key: "support", label: "Support", icon: Headset, href: "/faq" },
  { key: "settings", label: "Settings", icon: Settings, href: "#", soon: true },
];

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const base = "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors";

  if (item.soon) {
    return (
      <div className={`${base} text-[var(--brand-ink-faint)] cursor-default justify-between`}>
        <span className="flex items-center gap-3"><Icon className="w-[18px] h-[18px]" />{item.label}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">Soon</span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${base} ${
        active
          ? "bg-[#FF6A00]/10 text-[#FF6A00]"
          : "text-[var(--brand-ink-soft)] hover:bg-slate-50 hover:text-[var(--brand-navy)]"
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
      {item.label}
    </Link>
  );
}

function Sidebar({ active }: { active: ClientNavKey }) {
  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white border-r border-[var(--brand-border)] h-screen sticky top-0">
      <div className="px-5 pt-6 pb-5 border-b border-[var(--brand-border)]">
        <Link href="/client" className="flex items-center gap-2.5">
          <img src="/snapect-logo.png" alt="Snapect" className="h-8 w-auto object-contain" />
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-ink-faint)] mt-1.5 ml-0.5">
          BPO &amp; REO Field Inspections
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavRow key={item.key} item={item} active={item.key === active} />
        ))}
      </nav>

      <div className="px-3 pb-3 space-y-3">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-[var(--brand-navy)] to-[#12294f] text-white relative overflow-hidden">
          <Crown className="w-5 h-5 text-[#FF8C1A] mb-2" />
          <p className="text-sm font-bold leading-tight">Unlock Premium Benefits</p>
          <p className="text-xs text-white/60 mt-1 leading-snug">Buy credits in bulk and enjoy exclusive discounts and priority support.</p>
          <Link
            href="/client/wallet"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold bg-[#FF6A00] hover:bg-[#FF8C1A] text-white px-3 py-2 rounded-lg transition-colors"
          >
            Buy Credits <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl p-4 bg-slate-50 border border-[var(--brand-border)]">
          <div className="flex items-center gap-2 mb-1.5">
            <Headset className="w-4 h-4 text-[var(--brand-ink-soft)]" />
            <p className="text-sm font-bold text-[var(--brand-navy)]">Need Help?</p>
          </div>
          <p className="text-xs text-[var(--brand-ink-soft)] leading-snug mb-3">Our support team is here to help you 24/7.</p>
          <a
            href="/faq"
            className="block text-center text-xs font-bold text-[var(--brand-navy)] bg-white border border-[var(--brand-border)] hover:border-[#FF6A00] hover:text-[#FF6A00] py-2 rounded-lg transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  title, icon, userName, notificationCount = 0,
}: {
  title: string; icon: ReactNode; userName: string; notificationCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initial = (userName || "U").trim().charAt(0).toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[var(--brand-border)] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[#FF6A00]/10 text-[#FF6A00] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h1 className="font-[family-name:var(--font-jakarta)] font-bold text-[var(--brand-navy)] text-lg truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <button aria-label="Notifications" className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[var(--brand-ink-soft)] hover:bg-slate-50">
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-[var(--brand-ink-soft)] leading-none">Welcome back,</p>
              <p className="text-sm font-bold text-[var(--brand-navy)] leading-tight">{userName}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[var(--brand-navy)] text-white flex items-center justify-center font-bold text-sm">
              {initial}
            </div>
            <ChevronDown className="w-4 h-4 text-[var(--brand-ink-faint)] hidden sm:block" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white border border-[var(--brand-border)] rounded-xl shadow-lg z-20 overflow-hidden py-1.5">
                <Link href="/client/wallet" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--brand-ink-soft)] hover:bg-slate-50 hover:text-[var(--brand-navy)]">
                  <Wallet className="w-4 h-4" />Wallet &amp; Billing
                </Link>
                <button onClick={logout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#EF4444] hover:bg-red-50">
                  <LogOut className="w-4 h-4" />Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function ClientPortalShell({
  active, title, icon, userName, notificationCount = 0, children,
}: {
  active: ClientNavKey;
  title: string;
  icon: ReactNode;
  userName: string;
  notificationCount?: number;
  children: ReactNode;
}) {
  return (
    <div className="portal-shell min-h-screen flex">
      <Sidebar active={active} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} icon={icon} userName={userName} notificationCount={notificationCount} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
