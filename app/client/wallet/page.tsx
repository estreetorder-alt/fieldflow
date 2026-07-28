"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { Wallet, Loader2 } from "lucide-react";
import ClientPortalShell from "../../components/portal/ClientPortalShell";

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center text-slate-400">Loading…</div>}>
      <WalletPageInner />
    </Suspense>
  );
}

function WalletPageInner() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Client");
  const [bouncing, setBouncing] = useState(false);

  // Local-tunnel redirect (unchanged behavior)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    const isTunnel = host.includes("ngrok") || host.includes("loca.lt") || host.includes("trycloudflare");
    if (!isTunnel) return;
    const localBase = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
    if (!localBase.includes("localhost") && !localBase.includes("127.0.0.1")) return;
    setBouncing(true);
    window.location.replace(`${localBase}${window.location.pathname}${window.location.search}`);
  }, []);

  const fetchAll = useCallback(async () => {
    const [walletRes, meRes] = await Promise.all([
      fetch("/api/wallet"),
      fetch("/api/auth/me"),
    ]);

    if (walletRes.status === 401 || meRes.status === 401) {
      setLoading(false);
      return;
    }

    const [walletData, meData] = await Promise.all([walletRes.json(), meRes.json()]);
    setBalance(walletData.balance ?? 0);
    if (meData.user) setUserName(meData.user.name);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (bouncing) return;
    fetchAll();
  }, [fetchAll, bouncing]);

  if (bouncing) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center text-slate-600 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Returning to local app…
      </div>
    );
  }

  return (
    <ClientPortalShell active="wallet" title="Billing & Wallet" icon={<Wallet className="w-[18px] h-[18px]" />} userName={userName}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#081A36] to-[#12294f] rounded-2xl p-8 text-white shadow-xl">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#FF6A00]/10 rounded-full blur-2xl" />
          <div className="absolute right-6 bottom-6 opacity-20"><Wallet className="w-24 h-24" /></div>
          <p className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Wallet Balance</p>
          {loading ? (
            <p className="text-5xl font-extrabold text-white mb-1">…</p>
          ) : (
            <>
              <p className="text-5xl font-extrabold text-white mb-1">${balance.toFixed(2)}</p>
              <span className="inline-block mt-2 text-xs font-bold bg-[#FF6A00] rounded-full px-3 py-1">= {balance.toFixed(0)} Credits</span>
              <p className="text-slate-400 text-xs mt-3">$1 USD paid = $1 wallet credit</p>
            </>
          )}
        </div>
      </div>
    </ClientPortalShell>
  );
}
