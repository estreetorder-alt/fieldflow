"use client";
import { etDate, etDateTime, etTime } from "@/lib/est";
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
  const [linkOpened, setLinkOpened] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
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

  const selectedLink = paymentLinks.find(l => l.id === selectedLinkId) ?? null;

  // Step 1 — just open the payment link. Nothing is recorded: clicking is NOT paying.
  function openPaymentLink() {
    if (!selectedLink) return;
    window.open(selectedLink.url, "_blank", "noopener,noreferrer");
    setLinkOpened(true);
  }

  // Step 2 — the user explicitly claims they completed the payment.
  // This only creates an UNVERIFIED pending request that admin must confirm.
  async function confirmPaymentMade() {
    if (!selectedLink) return;
    setSubmittingClaim(true);
    const amt = selectedLink.amount ?? (Number(selectedLink.label.replace(/\D/g, "")) || 0);
    await fetch("/api/wallet", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amt, description: `Wallet top-up $${amt} — user reports payment sent (UNVERIFIED — confirm funds received before crediting)` }),
    }).catch(()=>{});
    setSubmittingClaim(false);
    setLinkOpened(false);
    setPaidPending(true);
    setShowTopup(false);
    setSelectedLinkId(null);
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

        {/* Claim submitted — awaiting admin verification */}
        {paidPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="font-bold text-amber-900 text-sm">Payment pending verification</p>
              <p className="text-amber-800 text-xs mt-0.5">We&apos;ve recorded that you reported a payment. Your balance will be credited only after our team verifies the payment was received.</p>
              <button onClick={() => setPaidPending(false)} className="text-xs text-amber-700 underline mt-1">Dismiss</button>
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
              <>
                {/* Amount tiles — tap to select */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {paymentLinks.map(link => {
                    const isSel = selectedLinkId === link.id;
                    return (
                      <button key={link.id} onClick={() => setSelectedLinkId(isSel ? null : link.id)}
                        className={`py-3.5 rounded-xl font-bold text-sm border-2 transition-all ${
                          isSel
                            ? "border-[#c8991a] bg-[#c8991a]/15 text-[#0f1f3d] ring-2 ring-[#c8991a]/40 scale-[1.03]"
                            : "border-slate-200 text-slate-700 hover:border-[#c8991a]"
                        }`}>
                        ${link.amount ?? link.label.replace(/\D/g, "")}
                      </button>
                    );
                  })}
                </div>

                {/* Step 1: open the payment link · Step 2: confirm payment was actually made */}
                {selectedLink && !linkOpened && (
                  <button onClick={openPaymentLink}
                    className="w-full flex items-center justify-center gap-2 bg-[#c8991a] hover:bg-[#f0b429] text-[#0f1f3d] font-extrabold py-3.5 rounded-xl text-base transition-colors shadow-sm">
                    Open Payment Page — ${selectedLink.amount ?? selectedLink.label.replace(/\D/g, "")} →
                  </button>
                )}
                {selectedLink && linkOpened && (
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                      Complete the payment in the tab that opened. Opening the page does <strong>not</strong> add funds — only click below <strong>after</strong> you&apos;ve actually paid.
                    </div>
                    <button onClick={confirmPaymentMade} disabled={submittingClaim}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl text-base transition-colors shadow-sm">
                      <CheckCircle className="w-4 h-4"/>{submittingClaim ? "Submitting…" : "✓ I've completed the payment"}
                    </button>
                    <div className="flex items-center justify-center gap-4">
                      <button onClick={openPaymentLink} className="text-xs text-slate-500 underline">Reopen payment page</button>
                      <button onClick={()=>{setLinkOpened(false);setSelectedLinkId(null);}} className="text-xs text-slate-400 underline">Cancel</button>
                    </div>
                  </div>
                )}
                {!selectedLink && (
                  <p className="text-xs text-slate-400 text-center">Select an amount above to continue</p>
                )}
              </>
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
                  <p className="text-xs text-slate-400" suppressHydrationWarning>{etDateTime(tx.createdAt)}</p>
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
