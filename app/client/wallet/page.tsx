"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, DollarSign, Plus, Clock, CheckCircle, ArrowDownCircle, ArrowUpCircle, RefreshCw, Wallet, AlertTriangle } from "lucide-react";

interface WalletTx { id: string; type: string; amount: number; balanceAfter: number; description: string; status: string; createdAt: string; }
interface PaymentLink { id: string; label: string; url: string; amount?: number; description: string; active: boolean; }

const TOP_UP_AMOUNTS = [15, 25, 30, 50, 75, 100, 125, 150];

const TYPE_COLORS: Record<string,string> = {
  topup: "text-green-600 bg-green-50",
  deduction: "text-red-600 bg-red-50",
  hold: "text-amber-600 bg-amber-50",
  release: "text-blue-600 bg-blue-50",
  refund: "text-purple-600 bg-purple-50",
};
const TYPE_ICONS: Record<string,React.ReactNode> = {
  topup: <ArrowDownCircle className="w-4 h-4"/>,
  deduction: <ArrowUpCircle className="w-4 h-4"/>,
  hold: <Clock className="w-4 h-4"/>,
  release: <CheckCircle className="w-4 h-4"/>,
  refund: <RefreshCw className="w-4 h-4"/>,
};

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [requestingTopup, setRequestingTopup] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [userName, setUserName] = useState("Client");

  const fetchWallet = useCallback(async () => {
    const [walletRes, linksRes, meRes] = await Promise.all([
      fetch("/api/wallet"),
      fetch("/api/payment-links"),
      fetch("/api/auth/me"),
    ]);
    const [walletData, linksData, meData] = await Promise.all([
      walletRes.json(), linksRes.json(), meRes.json(),
    ]);
    setBalance(walletData.balance ?? 0);
    setTransactions(walletData.transactions ?? []);
    setPaymentLinks(linksData.links?.filter((l: PaymentLink) => l.active) ?? []);
    if (meData.user) setUserName(meData.user.name);
    setLoading(false);
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const finalAmount = selectedAmount ?? (customAmount ? Number(customAmount) : null);

  async function requestTopup() {
    if (!finalAmount || finalAmount <= 0) return;
    setRequestingTopup(true);
    await fetch("/api/wallet", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: finalAmount, description: `Wallet top-up $${finalAmount}` }),
    });
    setTopupSuccess(true);
    setRequestingTopup(false);
    setShowTopup(false);
    fetchWallet();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/client")} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <img src="/snapect-logo.png" alt="Snapect" className="h-8 w-auto object-contain"/>
          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5 font-medium">My Wallet</span>
        </div>
        <span className="text-sm text-slate-600">Welcome, <span className="font-semibold">{userName}</span></span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Balance card */}
        <div className="bg-[#0f1f3d] rounded-2xl p-8 text-white text-center shadow-xl">
          <div className="w-16 h-16 bg-[#c8991a] rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white"/>
          </div>
          <p className="text-slate-300 text-sm font-medium uppercase tracking-wider mb-2">Available Balance</p>
          <p className="text-5xl font-extrabold text-white mb-1">${balance.toFixed(2)}</p>
          <p className="text-slate-400 text-xs mt-2">Funds are deducted when you accept an agent bid</p>
          <button onClick={() => setShowTopup(!showTopup)}
            className="mt-6 flex items-center gap-2 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-bold px-8 py-3 rounded-xl transition-colors mx-auto">
            <Plus className="w-4 h-4"/>Add Funds
          </button>
        </div>

        {/* Low balance warning */}
        {balance < 40 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="font-bold text-amber-900 text-sm">Low Balance</p>
              <p className="text-amber-800 text-xs mt-0.5">You need sufficient funds to accept agent bids. Add funds before placing orders.</p>
            </div>
          </div>
        )}

        {/* Topup success */}
        {topupSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="font-bold text-green-900 text-sm">Top-up Request Submitted!</p>
              <p className="text-green-800 text-xs mt-0.5">Complete your payment using the link below. Your wallet will be credited once we confirm receipt — usually within a few hours.</p>
              <button onClick={() => setTopupSuccess(false)} className="text-xs text-green-700 underline mt-1">Dismiss</button>
            </div>
          </div>
        )}

        {/* Top-up panel */}
        {showTopup && (
          <div className="bg-white border-2 border-[#c8991a] rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#0f1f3d] text-lg mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#c8991a]"/>Add Funds to Wallet
            </h2>
            <p className="text-xs text-slate-500 mb-5">Select an amount, then click the payment link to pay. We'll credit your wallet once payment is confirmed.</p>

            {/* Amount selection */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {TOP_UP_AMOUNTS.map(amt => (
                <button key={amt} onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                  className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                    selectedAmount === amt
                      ? "border-[#c8991a] bg-[#c8991a]/10 text-[#0f1f3d]"
                      : "border-slate-200 text-slate-700 hover:border-[#c8991a]"
                  }`}>
                  ${amt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-5">
              <div className="flex-1 h-px bg-slate-200"/>
              <span className="text-xs text-slate-400 font-medium">or enter custom amount</span>
              <div className="flex-1 h-px bg-slate-200"/>
            </div>

            <div className="relative mb-5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input type="number" min="1" value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                placeholder="Enter amount"
                className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a]"/>
            </div>

            {/* Payment links */}
            {paymentLinks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Payment links not configured yet. Contact <a href="mailto:support@snapect.com" className="text-[#c8991a] underline">support@snapect.com</a></p>
            ) : (
              <div className="space-y-3 mb-4">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Pay via:</p>
                {paymentLinks.map(link => (
                  <a key={link.id}
                    href={finalAmount ? `${link.url}` : link.url}
                    target="_blank" rel="noopener noreferrer"
                    onClick={() => { if (finalAmount) requestTopup(); }}
                    className="flex items-center justify-between gap-3 p-4 border-2 border-[#c8991a] rounded-xl hover:bg-[#c8991a]/5 transition-colors group">
                    <div>
                      <p className="font-bold text-[#0f1f3d]">{link.label}</p>
                      {link.description && <p className="text-xs text-slate-500">{link.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {finalAmount && <span className="font-bold text-[#c8991a] text-lg">${finalAmount}</span>}
                      <span className="text-xs bg-[#c8991a] text-white font-bold px-3 py-1.5 rounded-lg group-hover:bg-[#f0b429] whitespace-nowrap">
                        Pay Now →
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-400 text-center">After paying, click below to notify us. Your balance updates once confirmed.</p>
            <button onClick={requestTopup} disabled={!finalAmount || requestingTopup}
              className="w-full mt-3 bg-[#0f1f3d] hover:bg-[#1a3260] disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm">
              {requestingTopup ? "Submitting…" : `I've paid $${finalAmount ?? "—"} — notify admin`}
            </button>
          </div>
        )}

        {/* How wallet works */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-[#0f1f3d] mb-3 flex items-center gap-2"><Wallet className="w-4 h-4 text-[#c8991a]"/>How Your Wallet Works</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            {[
              "Add funds using fixed top-up amounts ($15, $25, $30, $50, $75, $100, $125, $150)",
              "Place inspection orders — agents bid on your order",
              "When you accept a bid, the bid amount is automatically held from your wallet",
              "Once the order is completed, the held amount is released to the agent",
              "If an order is cancelled, funds are automatically returned to your wallet",
              "Your wallet balance is always shown before accepting any bid",
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 bg-[#c8991a] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i+1}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Transaction history */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-[#0f1f3d]">Transaction History</h3>
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-300"/>
              <p>No transactions yet</p>
            </div>
          ) : transactions.map(tx => (
            <div key={tx.id} className="px-5 py-4 border-b border-slate-100 last:border-0 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${TYPE_COLORS[tx.type] ?? "bg-slate-100 text-slate-600"}`}>
                  {TYPE_ICONS[tx.type] ?? <DollarSign className="w-4 h-4"/>}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{tx.description}</p>
                  <p className="text-xs text-slate-400" suppressHydrationWarning>{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`font-bold ${tx.type === "topup" || tx.type === "refund" || tx.type === "release" ? "text-green-600" : "text-red-600"}`}>
                  {tx.type === "topup" || tx.type === "refund" ? "+" : "-"}${tx.amount.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">Balance: ${tx.balanceAfter.toFixed(2)}</p>
                {tx.status === "pending" && <span className="text-xs text-amber-600 font-medium">Pending</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
