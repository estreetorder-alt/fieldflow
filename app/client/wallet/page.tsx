"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, DollarSign, Plus, Clock, CheckCircle, ArrowDownCircle, ArrowUpCircle,
  RefreshCw, Wallet, AlertTriangle, CreditCard, XCircle, Loader2,
} from "lucide-react";

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
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading…</div>}>
      <WalletPageInner />
    </Suspense>
  );
}

function WalletPageInner() {
  const router = useRouter();
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

  // Whop must redirect to https (ngrok). Login cookies live on localhost —
  // bounce back so the wallet page can load with the session.
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

  // Redirect status from Whop (UX only — webhook is source of truth)
  useEffect(() => {
    if (bouncing) return;
    const topup = searchParams.get("topup");
    const card = searchParams.get("card");
    const checkoutStatus = searchParams.get("checkout_status") || searchParams.get("status");
    const err = searchParams.get("error");

    if (err) {
      setBanner({
        kind: "error",
        title: "Something went wrong",
        body: decodeURIComponent(err),
      });
      return;
    }

    if (topup === "success" || (checkoutStatus === "success" && searchParams.get("setup_intent_id") == null && !card)) {
      setBanner({
        kind: "success",
        title: "Payment submitted",
        body: "Whop confirmed your checkout. We’re crediting your wallet now — this usually takes a few seconds.",
      });
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
      setBanner({
        kind: "success",
        title: card === "added" ? "Card added" : "Card connected",
        body: "Your card was saved successfully. You can enable auto top-up and buy credits below.",
      });
      setPolling(true);
      const t = setTimeout(async () => {
        await fetchAll();
        setPolling(false);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [searchParams, fetchAll, bouncing]);

  async function buyPlan(planId: string) {
    setActionError("");
    setBusyPlanId(planId);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Could not start checkout");
        setBusyPlanId(null);
        return;
      }
      window.location.href = data.checkout_url || data.url;
    } catch {
      setActionError("Network error starting checkout");
      setBusyPlanId(null);
    }
  }

  async function buyCustom() {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      setActionError("Enter an amount of at least $1");
      return;
    }
    setActionError("");
    setBusyCustom(true);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Could not start checkout");
        setBusyCustom(false);
        return;
      }
      window.location.href = data.checkout_url || data.url;
    } catch {
      setActionError("Network error starting checkout");
      setBusyCustom(false);
    }
  }

  async function connectCard(purpose: "connect_card" | "add_card" = "connect_card") {
    setActionError("");
    setBusyCard(true);
    try {
      const res = await fetch("/api/wallet/connect-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Could not start card setup");
        setBusyCard(false);
        return;
      }
      window.location.href = data.checkout_url || data.url;
    } catch {
      setActionError("Network error starting card setup");
      setBusyCard(false);
    }
  }

  async function saveAutoTopup() {
    setAutoMsg("");
    setActionError("");
    if (autoPrefs.enabled && !hasCard && cards.length === 0) {
      setActionError("Connect a card before enabling auto top-up");
      return;
    }
    setAutoBusy(true);
    try {
      const res = await fetch("/api/wallet/auto-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: autoPrefs.enabled,
          thresholdUsd: autoPrefs.thresholdUsd,
          topupAmountUsd: autoPrefs.topupAmountUsd,
          planId: autoPrefs.planId,
          runNow: true,
        }),
      });
      const data = await res.json();
      setAutoBusy(false);
      if (!res.ok) {
        setActionError(data.error ?? "Could not save auto top-up");
        return;
      }
      if (data.prefs) {
        setAutoPrefs((p) => ({
          ...p,
          enabled: Boolean(data.prefs.enabled),
          thresholdUsd: Number(data.prefs.thresholdUsd),
          topupAmountUsd: Number(data.prefs.topupAmountUsd),
          planId: data.prefs.planId ?? null,
          cooldownUntil: data.prefs.cooldownUntil ?? null,
          lastStatus: data.prefs.lastStatus ?? null,
          lastError: data.prefs.lastError ?? null,
        }));
      }
      if (data.autoResult?.ran) {
        setAutoMsg(
          data.autoResult.creditedNow
            ? `Auto top-up charged $${Number(data.autoResult.amount).toFixed(2)} and credited your wallet.`
            : `Auto top-up of $${Number(data.autoResult.amount).toFixed(2)} started — credit applies when Whop confirms.`,
        );
        setTimeout(fetchAll, 2000);
      } else {
        setAutoMsg("Auto top-up preferences saved.");
      }
      fetchAll();
    } catch {
      setAutoBusy(false);
      setActionError("Network error saving auto top-up");
    }
  }

  const defaultCard = cards.find((c) => c.isDefault) ?? cards[0];

  if (bouncing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Returning to local app…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/client")} className="text-slate-400 hover:text-slate-600" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src="/snapect-logo.png" alt="Snapect" className="h-8 w-auto object-contain" />
          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5 font-medium">
            Billing & Wallet
          </span>
        </div>
        <span className="text-sm text-slate-600">
          Welcome, <span className="font-semibold">{userName}</span>
        </span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Balance */}
        <div className="bg-[#0f1f3d] rounded-2xl p-8 text-white text-center shadow-xl">
          <div className="w-16 h-16 bg-[#c8991a] rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-300 text-sm font-medium uppercase tracking-wider mb-2">Available credits</p>
          <p className="text-5xl font-extrabold text-white mb-1">${balance.toFixed(2)}</p>
          <p className="text-slate-400 text-xs mt-2">$1 USD paid = $1 wallet credit · USD only</p>
          {polling && (
            <p className="mt-3 text-xs text-[#f0b429] flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating balance…
            </p>
          )}
        </div>

        {/* Redirect / status banners */}
        {banner && (
          <div
            className={`rounded-xl p-4 flex items-start gap-3 border ${
              banner.kind === "success"
                ? "bg-green-50 border-green-200"
                : banner.kind === "error"
                  ? "bg-red-50 border-red-200"
                  : "bg-slate-50 border-slate-200"
            }`}
          >
            {banner.kind === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : banner.kind === "error" ? (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`font-bold text-sm ${
                  banner.kind === "success" ? "text-green-900" : banner.kind === "error" ? "text-red-900" : "text-slate-800"
                }`}
              >
                {banner.title}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  banner.kind === "success" ? "text-green-800" : banner.kind === "error" ? "text-red-700" : "text-slate-600"
                }`}
              >
                {banner.body}
              </p>
              <button onClick={() => setBanner(null)} className="text-xs underline mt-1 opacity-70">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900 text-sm">Could not continue</p>
              <p className="text-red-700 text-xs mt-0.5">{actionError}</p>
              <button onClick={() => setActionError("")} className="text-xs text-red-700 underline mt-1">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {balance < 40 && !banner && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 text-sm">Low balance</p>
              <p className="text-amber-800 text-xs mt-0.5">Add credits below so you can place and fund orders.</p>
            </div>
          </div>
        )}

        {/* Saved card */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#0f1f3d] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#c8991a]" />
                Payment card
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {cards.length > 0
                  ? "Your saved card is used for top-ups and auto top-up"
                  : "Save a card once — used for top-ups and future auto top-up"}
              </p>
            </div>
            {!cards.length && (
              <button
                onClick={() => connectCard("connect_card")}
                disabled={busyCard}
                className="text-xs font-bold bg-[#0f1f3d] hover:bg-[#1a3260] text-white px-3 py-2 rounded-lg disabled:opacity-50 whitespace-nowrap"
              >
                {busyCard ? "Redirecting…" : "Connect card"}
              </button>
            )}
          </div>
          <div className="px-5 py-4">
            {loading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : defaultCard ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 capitalize">
                      {defaultCard.brand || "Card"} ···· {defaultCard.last4 || "????"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {defaultCard.isDefault ? "Default card" : "Saved"}
                      {cards.length > 1 ? ` · ${cards.length} cards on file` : ""}
                    </p>
                  </div>
                  <span className="ml-auto text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Connected
                  </span>
                </div>
                {cards.length > 1 && (
                  <ul className="text-xs text-slate-500 space-y-1 pl-1 border-t border-slate-100 pt-2">
                    {cards
                      .filter((c) => c.id !== defaultCard.id)
                      .map((c) => (
                        <li key={c.id} className="capitalize">
                          {c.brand || "Card"} ···· {c.last4}
                        </li>
                      ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => connectCard("add_card")}
                  disabled={busyCard}
                  className="text-xs font-semibold text-[#0f1f3d] border border-slate-200 hover:border-[#c8991a] hover:bg-[#c8991a]/5 px-3 py-2 rounded-lg disabled:opacity-50"
                >
                  {busyCard ? "Redirecting…" : "+ Add another card"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No card on file yet. Connect a card to pay faster.</p>
            )}
          </div>
        </div>

        {/* Auto top-up */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-[#0f1f3d] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#c8991a]" />
              Auto top-up
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              When your balance drops to the threshold, we charge your saved card automatically ($1 = $1 credit)
            </p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-slate-800">Enable auto top-up</span>
              <button
                type="button"
                role="switch"
                aria-checked={autoPrefs.enabled}
                onClick={() => setAutoPrefs((p) => ({ ...p, enabled: !p.enabled }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${autoPrefs.enabled ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    autoPrefs.enabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">When balance is at or below ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={autoPrefs.thresholdUsd}
                  onChange={(e) => setAutoPrefs((p) => ({ ...p, thresholdUsd: Number(e.target.value) || 0 }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Top-up amount ($)</label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  step="1"
                  value={autoPrefs.topupAmountUsd}
                  onChange={(e) =>
                    setAutoPrefs((p) => ({ ...p, topupAmountUsd: Number(e.target.value) || 0, planId: null }))
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"
                />
              </div>
            </div>

            {plans.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Or use a plan amount</label>
                <select
                  value={autoPrefs.planId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    const plan = plans.find((p) => p.id === id);
                    setAutoPrefs((p) => ({
                      ...p,
                      planId: id,
                      topupAmountUsd: plan ? plan.amountUsd : p.topupAmountUsd,
                    }));
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c8991a]"
                >
                  <option value="">Custom amount above</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.amountUsd.toFixed(0)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!hasCard && cards.length === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Connect a card above before enabling auto top-up.
              </p>
            )}

            {autoPrefs.lastStatus === "failed" && autoPrefs.lastError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Last attempt failed: {autoPrefs.lastError}
              </p>
            )}

            {autoPrefs.cooldownUntil && new Date(autoPrefs.cooldownUntil).getTime() > Date.now() && (
              <p className="text-xs text-slate-500">
                Cooldown active until {new Date(autoPrefs.cooldownUntil).toLocaleString()} (prevents rapid retries)
              </p>
            )}

            {autoMsg && <p className="text-xs text-emerald-700 font-medium">{autoMsg}</p>}

            <button
              onClick={saveAutoTopup}
              disabled={autoBusy}
              className="w-full bg-[#0f1f3d] hover:bg-[#1a3260] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
            >
              {autoBusy ? "Saving…" : "Save auto top-up settings"}
            </button>
          </div>
        </div>

        {/* Admin plans */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-[#0f1f3d] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#c8991a]" />
              Buy credits
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Choose a package — you’ll pay securely on Whop, then return here</p>
          </div>

          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Loading plans…</div>
          ) : plans.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm px-4">
              No credit plans are available yet. Ask your admin to create plans in Admin → Wallet.
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => buyPlan(plan.id)}
                  disabled={busyPlanId === plan.id || busyCustom || busyCard}
                  className="text-left border-2 border-slate-200 hover:border-[#c8991a] rounded-xl p-4 transition-all disabled:opacity-50 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#0f1f3d] group-hover:text-[#c8991a]">{plan.name}</p>
                      {plan.description && <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>}
                    </div>
                    <span className="text-lg font-black text-emerald-600">${plan.amountUsd.toFixed(0)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {busyPlanId === plan.id ? "Opening Whop…" : `${plan.credits.toFixed(0)} credits · Pay with card →`}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Custom amount */}
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Custom amount</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="e.g. 75"
                  className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] bg-white"
                />
              </div>
              <button
                onClick={buyCustom}
                disabled={busyCustom || !!busyPlanId}
                className="flex items-center gap-1.5 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                {busyCustom ? "…" : "Pay"}
              </button>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-[#0f1f3d] mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#c8991a]" />
            How billing works
          </h3>
          <ul className="space-y-2 text-sm text-slate-600">
            {[
              "Pick a credit plan (or enter a custom USD amount)",
              "You’re redirected to Whop to pay by card",
              "After payment, you return here — wallet credit is applied when Whop confirms (webhook)",
              "Connect a card once to speed up future top-ups and enable auto top-up later",
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 bg-[#c8991a] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* History */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-[#0f1f3d]">Transaction history</h3>
            <button onClick={() => fetchAll()} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No transactions yet</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="px-5 py-4 border-b border-slate-100 last:border-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[tx.type] ?? "bg-slate-100 text-slate-600"}`}>
                    {TYPE_ICONS[tx.type] ?? <DollarSign className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{tx.description}</p>
                    <p className="text-xs text-slate-400" suppressHydrationWarning>
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={`font-bold ${
                      tx.type === "topup" || tx.type === "refund" || tx.type === "release" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tx.type === "topup" || tx.type === "refund" ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                  </p>
                  {tx.status === "confirmed" && (
                    <p className="text-xs text-slate-400">Balance: ${Number(tx.balanceAfter).toFixed(2)}</p>
                  )}
                  {tx.status === "pending" && <span className="text-xs text-amber-600 font-medium">Pending</span>}
                  {tx.status === "failed" && <span className="text-xs text-red-600 font-medium">Failed</span>}
                  {tx.status === "cancelled" && <span className="text-xs text-slate-500 font-medium">Cancelled</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
