"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, DollarSign, Plus, Clock, CheckCircle, ArrowDownCircle, ArrowUpCircle, RefreshCw, Wallet, AlertTriangle } from "lucide-react";

interface WalletTx { id: string; type: string; amount: number; balanceAfter: number; description: string; status: string; createdAt: string; }
interface PaymentLink { id: string; label: string; url: string; amount?: number; description: string; active: boolean; }

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
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-slate-400">Loading…</div>}>
      <WalletPageInner />
    </Suspense>
  );
}

function WalletPageInner() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [paidPending, setPaidPending] = useState(false);
  const [userName, setUserName] = useState("Vendor");

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

  // Opening a payment link silently records a pending top-up in the background
  async function handleLinkClick(link: PaymentLink) {
    if (link.amount && link.amount > 0) {
      await fetch("/api/wallet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: link.amount, description: `Wallet top-up — ${link.label} $${link.amount}` }),
      }).catch(()=>{});
    }
    setPaidPending(true);
    fetchWallet();
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/client")} className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <img src="/snapect-logo.png" alt="Snapect" className="h-8 w-auto object-contain"/>
          <span className="text-xs bg-[#c8991a]/10 text-[#0f1f3d] border border-[#c8991a]/30 rounded-full px-2 py-0.5 font-medium">My Wallet</span>
        </div>
        <span className="text-sm text-slate-600">Welcome, <span className="font-semibold">{userName}</span></span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Balance card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-[#c8991a] rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white"/>
          </div>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Available Balance</p>
          <p className="text-5xl font-extrabold text-[#0f1f3d] mb-1">${balance.toFixed(2)}</p>
          <p className="text-slate-400 text-xs mt-2">Funds are deducted automatically when you accept an agent offer</p>
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
              <p className="text-amber-800 text-xs mt-0.5">You need sufficient funds to accept agent offers. Add funds before accepting an offer.</p>
            </div>
          </div>
        )}

        {/* Paid confirmation */}
        {paidPending && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="font-bold text-green-900 text-sm">Payment in progress</p>
              <p className="text-green-800 text-xs mt-0.5">Complete your payment in the tab that opened. Your balance will update automatically once the payment is processed.</p>
              <button onClick={() => setPaidPending(false)} className="text-xs text-green-700 underline mt-1">Dismiss</button>
            </div>
          </div>
        )}

        {/* Top-up panel — fixed payment links only */}
        {showTopup && (
          <div className="bg-white border-2 border-[#c8991a] rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-[#0f1f3d] text-lg mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#c8991a]"/>Add Funds to Wallet
            </h2>
            <p className="text-xs text-slate-500 mb-5">Choose one of the payment options below. Your wallet balance updates automatically once the payment is processed.</p>

            {paymentLinks.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Payment options are being set up. Contact <a href="mailto:info@snapect.com" className="text-[#c8991a] underline">info@snapect.com</a></p>
            ) : (
              <div className="space-y-3">
                {paymentLinks.map(link => (
                  <a key={link.id}
                    href={link.url}
                    target="_blank" rel="noopener noreferrer"
                    onClick={() => handleLinkClick(link)}
                    className="flex items-center justify-between gap-3 p-4 border-2 border-[#c8991a] rounded-xl hover:bg-[#c8991a]/5 transition-colors group">
                    <div>
                      <p className="font-bold text-[#0f1f3d]">{link.label}</p>
                      {link.description && <p className="text-xs text-slate-500">{link.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {link.amount ? <span className="font-bold text-[#c8991a] text-lg">${link.amount}</span> : null}
                      <span className="text-xs bg-[#c8991a] text-white font-bold px-3 py-1.5 rounded-lg group-hover:bg-[#f0b429] whitespace-nowrap">
                        Pay Now →
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* How wallet works */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-[#0f1f3d] mb-3 flex items-center gap-2"><Wallet className="w-4 h-4 text-[#c8991a]"/>How Your Wallet Works</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            {[
              "Add funds using any of the payment options above",
              "Place inspection orders — agents send offers on your order",
              "When you accept an offer, the amount is automatically deducted from your wallet and the order is assigned",
              "Once the order is completed, the amount is released to the agent",
              "If an order is cancelled, funds are automatically returned to your wallet",
              "Your wallet balance is always shown before accepting any offer",
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
                {tx.status === "pending" && <span className="text-xs text-amber-600 font-medium">Processing</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
