"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  DollarSign, Plus, Clock, CheckCircle, ArrowDownCircle, ArrowUpCircle,
  RefreshCw, Wallet, AlertTriangle, CreditCard, XCircle, Loader2, Sparkles,
  Zap, History as HistoryIcon, Settings2, TrendingUp, ChevronDown,
} from "lucide-react";
import ClientPortalShell from "../../components/portal/ClientPortalShell";

interface WalletTx {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  status: string;
  createdAt: string;
}
interface WalletPlan {
  id: string;
  name: string;
  amountUsd: number;
  credits: number;
  description: string;
  active: boolean;
  sortOrder: number;
}
interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  isDefault: boolean;
}
interface AutoPrefs {
  enabled: boolean;
  thresholdUsd: number;
  topupAmountUsd: number;
  planId: string | null;
  cooldownUntil: string | null;
  lastStatus: string | null;
  lastError: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  topup: "text-green-600 bg-green-50",
  deduction: "text-red-600 bg-red-50",
  hold: "text-amber-600 bg-amber-50",
  release: "text-blue-600 bg-blue-50",
  refund: "text-purple-600 bg-purple-50",
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  topup: <ArrowDownCircle className="w-4 h-4" />,
  deduction: <ArrowUpCircle className="w-4 h-4" />,
  hold: <Clock className="w-4 h-4" />,
  release: <CheckCircle className="w-4 h-4" />,
  refund: <RefreshCw className="w-4 h-4" />,
};

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center text-slate-400">Loading…</div>}>
      <WalletPageInner />
    </Suspense>
  );
}

function WalletPageInner() {
  const searchParams = useSearchParams();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [plans, setPlans] = useState<WalletPlan[]>([]);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Client");
  const [bouncing, setBouncing] = useState(false);

  const [customAmount, setCustomAmount] = useState("");
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [busyCustom, setBusyCustom] = useState(false);
  const [busyCard, setBusyCard] = useState(false);
  const [actionError, setActionError] = useState("");
  const [banner, setBanner] = useState<{ kind: "success" | "info" | "error"; title: string; body: string } | null>(null);
  const [polling, setPolling] = useState(false);

  const [autoPrefs, setAutoPrefs] = useState<AutoPrefs>({
    enabled: false,
    thresholdUsd: 25,
    topupAmountUsd: 50,
    planId: null,
    cooldownUntil: null,
    lastStatus: null,
    lastError: null,
  });
  const [hasCard, setHasCard] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoMsg, setAutoMsg] = useState("");

  const buyCreditsRef = useRef<HTMLDivElement>(null);
  const paymentCardRef = useRef<HTMLDivElement>(null);
  const autoTopupRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

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
    const [walletRes, plansRes, cardsRes, autoRes, meRes] = await Promise.all([
      fetch("/api/wallet"),
      fetch("/api/wallet/plans"),
      fetch("/api/wallet/connect-card"),
      fetch("/api/wallet/auto-topup"),
      fetch("/api/auth/me"),
    ]);

    if (walletRes.status === 401 || meRes.status === 401) {
      setLoading(false);
      setActionError("Session expired — please log in again, then reopen Wallet.");
      return;
    }

    const [walletData, plansData, cardsData, autoData, meData] = await Promise.all([
      walletRes.json(),
      plansRes.json(),
      cardsRes.json(),
      autoRes.json(),
      meRes.json(),
    ]);
    setBalance(walletData.balance ?? 0);
    setTransactions(walletData.transactions ?? []);
    setPlans(plansData.plans ?? []);
    setCards(cardsData.methods ?? []);
    setHasCard(Boolean(autoData.hasCard ?? cardsData.cardConnected));
    if (autoData.prefs) {
      setAutoPrefs({
        enabled: Boolean(autoData.prefs.enabled),
        thresholdUsd: Number(autoData.prefs.thresholdUsd ?? 25),
        topupAmountUsd: Number(autoData.prefs.topupAmountUsd ?? 50),
        planId: autoData.prefs.planId ?? null,
        cooldownUntil: autoData.prefs.cooldownUntil ?? null,
        lastStatus: autoData.prefs.lastStatus ?? null,
        lastError: autoData.prefs.lastError ?? null,
      });
    }
    if (meData.user) setUserName(meData.user.name);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (bouncing) return;
    fetchAll();
  }, [fetchAll, bouncing]);

  useEffect(() => {
    if (bouncing) return;
    const topup = searchParams.get("topup");
    const card = searchParams.get("card");
    const checkoutStatus = searchParams.get("checkout_status") || searchParams.get("status");
    const err = searchParams.get("error");

    if (err) {
      setBanner({ kind: "error", title: "Something went wrong", body: decodeURIComponent(err) });
      return;
    }

    if (topup === "success" || (checkoutStatus === "success" && searchParams.get("setup_intent_id") == null && !card)) {
      setBanner({ kind: "success", title: "Payment submitted", body: "We're crediting your wallet now — this usually takes a few seconds." });
      setPolling(true);
      let n = 0;
      const id = setInterval(async () => {
        n += 1;
        await fetchAll();
        if (n >= 6) {
          clearInterval(id);
          setPolling(false);
        }
      }, 2000);
      return () => clearInterval(id);
    }

    if (topup === "cancelled" || topup === "failed") {
      setBanner({
        kind: "error",
        title: topup === "cancelled" ? "Payment cancelled" : "Payment failed",
        body: "No wallet credit was applied. You can try again with a plan or custom amount.",
      });
      return;
    }

    if (card === "connected" || card === "added" || (checkoutStatus === "success" && searchParams.get("setup_intent_id"))) {
      setBanner({ kind: "success", title: card === "added" ? "Card added" : "Card connected", body: "Your card was saved successfully. You can enable auto top-up and buy credits below." });
      setPolling(true);
      const t = setTimeout(async () => {
        await fetchAll();
        setPolling(false);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [searchParams, fetchAll, bouncing]);

  function afterCheckoutStarted(checkoutUrl: string) {
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
    setBanner({
      kind: "info",
      title: "Payment page opened in a new tab",
      body: "Complete your payment there. We only credit your wallet after it's confirmed — check back here or refresh in a few minutes.",
    });
    setPolling(true);
    let n = 0;
    const id = setInterval(async () => {
      n += 1;
      await fetchAll();
      if (n >= 6) { clearInterval(id); setPolling(false); }
    }, 4000);
  }

  async function buyPlan(planId: string) {
    setActionError("");
    setBusyPlanId(planId);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      setBusyPlanId(null);
      if (!res.ok) { setActionError(data.error ?? "Could not start checkout"); return; }
      afterCheckoutStarted(data.checkout_url || data.url);
    } catch {
      setActionError("Network error starting checkout"); setBusyPlanId(null);
    }
  }

  async function buyCustom() {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount < 1) { setActionError("Enter an amount of at least $1"); return; }
    setActionError(""); setBusyCustom(true);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      setBusyCustom(false);
      if (!res.ok) { setActionError(data.error ?? "Could not start checkout"); return; }
      afterCheckoutStarted(data.checkout_url || data.url);
    } catch {
      setActionError("Network error starting checkout"); setBusyCustom(false);
    }
  }

  async function connectCard(purpose: "connect_card" | "add_card" = "connect_card") {
    setActionError(""); setBusyCard(true);
    try {
      const res = await fetch("/api/wallet/connect-card", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purpose }),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error ?? "Could not start card setup"); setBusyCard(false); return; }
      window.location.href = data.checkout_url || data.url;
    } catch {
      setActionError("Network error starting card setup"); setBusyCard(false);
    }
  }

  async function saveAutoTopup() {
    setAutoMsg(""); setActionError("");
    if (autoPrefs.enabled && !hasCard && cards.length === 0) { setActionError("Connect a card before enabling auto top-up"); return; }
    setAutoBusy(true);
    try {
      const res = await fetch("/api/wallet/auto-topup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: autoPrefs.enabled, thresholdUsd: autoPrefs.thresholdUsd, topupAmountUsd: autoPrefs.topupAmountUsd, planId: autoPrefs.planId, runNow: true }),
      });
      const data = await res.json();
      setAutoBusy(false);
      if (!res.ok) { setActionError(data.error ?? "Could not save auto top-up"); return; }
      if (data.prefs) {
        setAutoPrefs((p) => ({
          ...p, enabled: Boolean(data.prefs.enabled), thresholdUsd: Number(data.prefs.thresholdUsd),
          topupAmountUsd: Number(data.prefs.topupAmountUsd), planId: data.prefs.planId ?? null,
          cooldownUntil: data.prefs.cooldownUntil ?? null, lastStatus: data.prefs.lastStatus ?? null, lastError: data.prefs.lastError ?? null,
        }));
      }
      if (data.autoResult?.ran) {
        setAutoMsg(data.autoResult.creditedNow
          ? `Auto top-up charged $${Number(data.autoResult.amount).toFixed(2)} and credited your wallet.`
          : `Auto top-up of $${Number(data.autoResult.amount).toFixed(2)} started — credit applies once confirmed.`);
        setTimeout(fetchAll, 2000);
      } else {
        setAutoMsg("Auto top-up preferences saved.");
      }
      fetchAll();
    } catch {
      setAutoBusy(false); setActionError("Network error saving auto top-up");
    }
  }

  const defaultCard = cards.find((c) => c.isDefault) ?? cards[0];

  const pendingCredits = transactions.filter((t) => t.status === "pending" && t.type === "topup").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSpent = transactions.filter((t) => t.status === "confirmed" && (t.type === "deduction" || t.type === "hold")).reduce((sum, t) => sum + Number(t.amount), 0);
  // Only confirmed payments belong in the visible history — a click that
  // returns without paying (or a payment still awaiting admin confirmation)
  // should not show up as a transaction until it's actually confirmed.
  const confirmedTransactions = transactions.filter((t) => t.status === "confirmed");

  const balanceHistory = transactions
    .filter((t) => t.status === "confirmed")
    .slice(0, 12)
    .map((t) => Number(t.balanceAfter))
    .reverse();
  const sparkPoints = (() => {
    if (balanceHistory.length < 2) return "";
    const w = 220, h = 56;
    const min = Math.min(...balanceHistory), max = Math.max(...balanceHistory);
    const range = max - min || 1;
    return balanceHistory
      .map((v, i) => {
        const x = (i / (balanceHistory.length - 1)) * w;
        const y = h - ((v - min) / range) * (h - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  })();

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
        {banner && (
          <div className={`mb-6 rounded-xl p-4 flex items-start gap-3 border ${banner.kind === "success" ? "bg-green-50 border-green-200" : banner.kind === "error" ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
            {banner.kind === "success" ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> : banner.kind === "error" ? <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className={`font-bold text-sm ${banner.kind === "success" ? "text-green-900" : banner.kind === "error" ? "text-red-900" : "text-slate-800"}`}>{banner.title}</p>
              <p className={`text-xs mt-0.5 ${banner.kind === "success" ? "text-green-800" : banner.kind === "error" ? "text-red-700" : "text-slate-600"}`}>{banner.body}</p>
              <button onClick={() => setBanner(null)} className="text-xs underline mt-1 opacity-70">Dismiss</button>
            </div>
          </div>
        )}
        {actionError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900 text-sm">Could not continue</p>
              <p className="text-red-700 text-xs mt-0.5">{actionError}</p>
              <button onClick={() => setActionError("")} className="text-xs text-red-700 underline mt-1">Dismiss</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#081A36] to-[#12294f] rounded-2xl p-8 text-white shadow-xl">
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#FF6A00]/10 rounded-full blur-2xl" />
              <div className="absolute right-6 bottom-6 opacity-20"><Wallet className="w-24 h-24" /></div>
              <p className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Wallet Balance</p>
              <p className="text-5xl font-extrabold text-white mb-1">${balance.toFixed(2)}</p>
              <span className="inline-block mt-2 text-xs font-bold bg-[#FF6A00] rounded-full px-3 py-1">= {balance.toFixed(0)} Credits</span>
              <p className="text-slate-400 text-xs mt-3">$1 USD paid = $1 wallet credit</p>
              {polling && <p className="mt-3 text-xs text-[#FF8C1A] flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating balance…</p>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Buy Credits", sub: "Add credits", icon: <Plus className="w-5 h-5" />, color: "bg-violet-100 text-violet-600", onClick: () => scrollTo(buyCreditsRef) },
                { label: "Payment Card", sub: "Manage card", icon: <CreditCard className="w-5 h-5" />, color: "bg-blue-100 text-blue-600", onClick: () => scrollTo(paymentCardRef) },
                { label: "Auto Top-up", sub: "Keep ready", icon: <RefreshCw className="w-5 h-5" />, color: "bg-emerald-100 text-emerald-600", onClick: () => scrollTo(autoTopupRef) },
                { label: "Transactions", sub: "View activity", icon: <HistoryIcon className="w-5 h-5" />, color: "bg-amber-100 text-amber-600", onClick: () => scrollTo(historyRef) },
              ].map((t) => (
                <button key={t.label} onClick={t.onClick} className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-[#FF6A00] hover:shadow-sm transition-all">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${t.color}`}>{t.icon}</div>
                  <p className="text-sm font-bold text-[#081A36]">{t.label}</p>
                  <p className="text-xs text-slate-400">{t.sub}</p>
                </button>
              ))}
            </div>

            {balance < 40 && !banner && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900 text-sm">Low balance</p>
                  <p className="text-amber-800 text-xs mt-0.5">Add credits below so you can place and fund orders.</p>
                </div>
              </div>
            )}

            <div ref={paymentCardRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden scroll-mt-20">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[#081A36] flex items-center gap-2"><CreditCard className="w-4 h-4 text-[#FF6A00]" />Payment card</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{cards.length > 0 ? "Your saved card is used for auto top-up" : "Save a card once — used for auto top-up"}</p>
                </div>
                {!cards.length && (
                  <button onClick={() => connectCard("connect_card")} disabled={busyCard} className="text-xs font-bold bg-[#081A36] hover:bg-[#12294f] text-white px-3 py-2 rounded-lg disabled:opacity-50 whitespace-nowrap">
                    {busyCard ? "Redirecting…" : "Connect card"}
                  </button>
                )}
              </div>
              <div className="px-5 py-4">
                {loading ? <p className="text-sm text-slate-400">Loading…</p> : defaultCard ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><CreditCard className="w-5 h-5 text-slate-600" /></div>
                      <div>
                        <p className="font-semibold text-slate-800 capitalize">{defaultCard.brand || "Card"} ···· {defaultCard.last4 || "????"}</p>
                        <p className="text-xs text-slate-400">{defaultCard.isDefault ? "Default card" : "Saved"}{cards.length > 1 ? ` · ${cards.length} cards on file` : ""}</p>
                      </div>
                      <span className="ml-auto text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Connected</span>
                    </div>
                    {cards.length > 1 && (
                      <ul className="text-xs text-slate-500 space-y-1 pl-1 border-t border-slate-100 pt-2">
                        {cards.filter((c) => c.id !== defaultCard.id).map((c) => (<li key={c.id} className="capitalize">{c.brand || "Card"} ···· {c.last4}</li>))}
                      </ul>
                    )}
                    <button type="button" onClick={() => connectCard("add_card")} disabled={busyCard} className="text-xs font-semibold text-[#081A36] border border-slate-200 hover:border-[#FF6A00] hover:bg-[#FF6A00]/5 px-3 py-2 rounded-lg disabled:opacity-50">
                      {busyCard ? "Redirecting…" : "+ Add another card"}
                    </button>
                  </div>
                ) : <p className="text-sm text-slate-500">No card on file yet. Connect a card for auto top-up.</p>}
              </div>
            </div>

            <div ref={autoTopupRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden scroll-mt-20">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-[#081A36] flex items-center gap-2"><RefreshCw className="w-4 h-4 text-[#FF6A00]" />Auto top-up</h2>
                <p className="text-xs text-slate-400 mt-0.5">When your balance drops to the threshold, we charge your saved card automatically ($1 = $1 credit)</p>
              </div>
              <div className="px-5 py-4 space-y-4">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-sm font-medium text-slate-800">Enable auto top-up</span>
                  <button type="button" role="switch" aria-checked={autoPrefs.enabled} onClick={() => setAutoPrefs((p) => ({ ...p, enabled: !p.enabled }))} className={`relative w-11 h-6 rounded-full transition-colors ${autoPrefs.enabled ? "bg-emerald-500" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoPrefs.enabled ? "translate-x-5" : ""}`} />
                  </button>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">When balance is at or below ($)</label>
                    <input type="number" min="0" step="1" value={autoPrefs.thresholdUsd} onChange={(e) => setAutoPrefs((p) => ({ ...p, thresholdUsd: Number(e.target.value) || 0 }))} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Top-up amount ($)</label>
                    <input type="number" min="1" max="5000" step="1" value={autoPrefs.topupAmountUsd} onChange={(e) => setAutoPrefs((p) => ({ ...p, topupAmountUsd: Number(e.target.value) || 0, planId: null }))} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]" />
                  </div>
                </div>
                {plans.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Or use a plan amount</label>
                    <select value={autoPrefs.planId ?? ""} onChange={(e) => { const id = e.target.value || null; const plan = plans.find((p) => p.id === id); setAutoPrefs((p) => ({ ...p, planId: id, topupAmountUsd: plan ? plan.amountUsd : p.topupAmountUsd })); }} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]">
                      <option value="">Custom amount above</option>
                      {plans.map((p) => (<option key={p.id} value={p.id}>{p.name} — ${p.amountUsd.toFixed(0)}</option>))}
                    </select>
                  </div>
                )}
                {!hasCard && cards.length === 0 && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Connect a card above before enabling auto top-up.</p>}
                {autoPrefs.lastStatus === "failed" && autoPrefs.lastError && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">Last attempt failed: {autoPrefs.lastError}</p>}
                {autoPrefs.cooldownUntil && new Date(autoPrefs.cooldownUntil).getTime() > Date.now() && <p className="text-xs text-slate-500">Cooldown active until {new Date(autoPrefs.cooldownUntil).toLocaleString()} (prevents rapid retries)</p>}
                {autoMsg && <p className="text-xs text-emerald-700 font-medium">{autoMsg}</p>}
                <button onClick={saveAutoTopup} disabled={autoBusy} className="w-full bg-[#FF6A00] hover:bg-[#FF8C1A] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {autoBusy ? "Saving…" : "Save auto top-up settings"}
                </button>
              </div>
            </div>

            <div ref={buyCreditsRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden scroll-mt-20">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-[#081A36] flex items-center gap-2"><DollarSign className="w-4 h-4 text-[#FF6A00]" />Buy credits</h2>
                <p className="text-xs text-slate-400 mt-0.5">Choose a package — you&apos;ll pay securely via our payment link, then come back here</p>
              </div>
              {loading ? <div className="text-center py-10 text-slate-400 text-sm">Loading plans…</div> : plans.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm px-4">No credit plans are available yet. Ask your admin to create plans in Admin → Wallet.</div>
              ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plans.map((plan) => (
                    <button key={plan.id} onClick={() => buyPlan(plan.id)} disabled={busyPlanId === plan.id || busyCustom || busyCard} className="text-left border-2 border-slate-200 hover:border-[#FF6A00] rounded-xl p-4 transition-all disabled:opacity-50 group">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-[#081A36] group-hover:text-[#FF6A00]">{plan.name}</p>
                          {plan.description && <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>}
                        </div>
                        <span className="text-lg font-black text-emerald-600">${plan.amountUsd.toFixed(0)}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">{busyPlanId === plan.id ? "Opening checkout…" : `${plan.credits.toFixed(0)} credits · Pay via secure link →`}</p>
                    </button>
                  ))}
                </div>
              )}
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Custom amount</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input type="number" min="1" max="5000" step="0.01" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="25, 50, 75, 100 or 150" className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00] bg-white" />
                  </div>
                  <button onClick={buyCustom} disabled={busyCustom || !!busyPlanId} className="flex items-center gap-1.5 bg-[#FF6A00] hover:bg-[#FF8C1A] text-white font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50 whitespace-nowrap">
                    <Plus className="w-4 h-4" />{busyCustom ? "…" : "Pay"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Only $25, $50, $75, $100, or $150 can be paid right now.</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-bold text-[#081A36] mb-3 flex items-center gap-2"><Wallet className="w-4 h-4 text-[#FF6A00]" />How billing works</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {["Pick a credit plan ($25, $50, $75, $100, or $150)", "A secure payment page opens in a new tab", "Come back here — wallet credit is applied once we confirm the payment", "Connect a card once to enable auto top-up later"].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-[#FF6A00] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-[#081A36]">Quick Actions</h3></div>
              <div className="divide-y divide-slate-100">
                {[
                  { icon: <CreditCard className="w-4 h-4" />, color: "bg-violet-100 text-violet-600", title: "Add Payment Method", sub: "Securely add a new card", onClick: () => scrollTo(paymentCardRef) },
                  { icon: <DollarSign className="w-4 h-4" />, color: "bg-emerald-100 text-emerald-600", title: "Buy Credits", sub: "Choose a credit package", onClick: () => scrollTo(buyCreditsRef) },
                  { icon: <Settings2 className="w-4 h-4" />, color: "bg-amber-100 text-amber-600", title: "Auto Top-up Settings", sub: "Manage your preferences", onClick: () => scrollTo(autoTopupRef) },
                  { icon: <HistoryIcon className="w-4 h-4" />, color: "bg-blue-100 text-blue-600", title: "Billing History", sub: "View invoices & receipts", onClick: () => scrollTo(historyRef) },
                ].map((a) => (
                  <button key={a.title} onClick={a.onClick} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 text-left">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>{a.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                      <p className="text-xs text-slate-400 truncate">{a.sub}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-300 -rotate-90 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-[#081A36]">Wallet Overview</h3>
                <TrendingUp className="w-4 h-4 text-[#22C55E]" />
              </div>
              {sparkPoints ? (
                <svg viewBox="0 0 220 56" className="w-full h-14 mb-2" preserveAspectRatio="none">
                  <polyline points={sparkPoints} fill="none" stroke="#FF6A00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <p className="text-xs text-slate-400 py-4">Balance history will chart here once you have a few transactions.</p>
              )}
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">Total Credits</span><span className="font-bold text-slate-800">{balance.toFixed(0)}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Available Credits</span><span className="font-bold text-slate-800">{balance.toFixed(0)}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Pending Credits</span><span className="font-bold text-slate-800">{pendingCredits.toFixed(0)}</span></div>
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100"><span className="text-slate-500">Total Spent</span><span className="font-bold text-slate-800">${totalSpent.toFixed(2)}</span></div>
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-3 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Credits never expire</p>
            </div>

            <div className="bg-[#081A36] rounded-2xl p-5 text-white relative overflow-hidden">
              <Sparkles className="w-5 h-5 text-[#FF6A00] mb-2" />
              <h3 className="font-bold mb-1">Get More, Save More</h3>
              <p className="text-xs text-slate-300 mb-4">Buy larger credit packs and get better value for your money.</p>
              <button onClick={() => scrollTo(buyCreditsRef)} className="bg-white text-[#081A36] text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-100">Buy Credits</button>
            </div>
          </div>
        </div>

        <div ref={historyRef} className="bg-white border border-slate-200 rounded-2xl overflow-hidden mt-6 scroll-mt-20">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-[#081A36]">Recent Transactions</h3>
            <button onClick={() => fetchAll()} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          </div>
          {loading ? <div className="text-center py-8 text-slate-400 text-sm">Loading…</div> : confirmedTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-300" /><p>No confirmed transactions yet</p><p className="text-xs mt-1">Payments show up here once they're confirmed — pending or unconfirmed attempts aren't listed.</p></div>
          ) : (
            confirmedTransactions.map((tx) => (
              <div key={tx.id} className="px-5 py-4 border-b border-slate-100 last:border-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[tx.type] ?? "bg-slate-100 text-slate-600"}`}>{TYPE_ICONS[tx.type] ?? <DollarSign className="w-4 h-4" />}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{tx.description}</p>
                    <p className="text-xs text-slate-400" suppressHydrationWarning>{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold ${tx.type === "topup" || tx.type === "refund" || tx.type === "release" ? "text-green-600" : "text-red-600"}`}>{tx.type === "topup" || tx.type === "refund" ? "+" : "-"}${Number(tx.amount).toFixed(2)}</p>
                  <p className="text-xs text-slate-400">Balance: ${Number(tx.balanceAfter).toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> Your payments are secure and encrypted. Need help? <a href="/contact" className="text-[#FF6A00] font-medium hover:underline">Contact support</a>
        </p>
      </div>
    </ClientPortalShell>
  );
}
