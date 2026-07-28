"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import {
  Wallet, Loader2, DollarSign, Upload, CheckCircle, XCircle, Clock,
  Copy, Check, ImageIcon, RefreshCw,
} from "lucide-react";
import ClientPortalShell from "../../components/portal/ClientPortalShell";
import { uploadImageFile } from "@/lib/uploadClient";

interface WalletTx {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  status: string;
  createdAt: string;
  purpose?: string;
  receiptUrl?: string | null;
  orderNumber?: string | null;
}

const CASHAPP_ID = "$snapect";

const TX_TYPE_LABEL: Record<string, string> = {
  topup: "Top-up",
  deduction: "Order Payment",
  hold: "Order Hold",
  release: "Payout Released",
  refund: "Refund",
};
const CREDIT_TYPES = new Set(["topup", "refund", "release"]);

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center text-slate-400">Loading…</div>}>
      <WalletPageInner />
    </Suspense>
  );
}

function WalletPageInner() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Client");
  const [bouncing, setBouncing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cash App payment proof form
  const [payAmount, setPayAmount] = useState("");
  const [payOrderNumber, setPayOrderNumber] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setTransactions(walletData.transactions ?? []);
    if (meData.user) setUserName(meData.user.name);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (bouncing) return;
    fetchAll();
  }, [fetchAll, bouncing]);

  function copyCashAppId() {
    navigator.clipboard?.writeText(CASHAPP_ID).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function submitPaymentProof() {
    setFormMsg(null);
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormMsg({ kind: "error", text: "Enter the amount you paid." });
      return;
    }
    if (!receiptFile) {
      setFormMsg({ kind: "error", text: "Upload a screenshot of your payment receipt." });
      return;
    }
    setSubmitting(true);
    try {
      const { url } = await uploadImageFile(receiptFile, "wallet-receipts");
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          orderNumber: payOrderNumber || undefined,
          receiptUrl: url,
          description: `Cash App payment — $${amount}${payOrderNumber ? ` (Order #${payOrderNumber})` : ""}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormMsg({ kind: "error", text: data.error ?? "Could not submit payment proof." });
        setSubmitting(false);
        return;
      }
      setFormMsg({ kind: "success", text: "Payment proof submitted! We'll verify it and credit your wallet shortly." });
      setPayAmount("");
      setPayOrderNumber("");
      setReceiptFile(null);
      setReceiptPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchAll();
    } catch {
      setFormMsg({ kind: "error", text: "Something went wrong uploading your receipt. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const myCashAppSubmissions = transactions.filter((t) => t.purpose === "cashapp_topup");
  // Only confirmed transactions belong in visible history — pending/unconfirmed attempts aren't listed
  const confirmedTransactions = transactions.filter((t) => t.status === "confirmed");

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#081A36] to-[#12294f] rounded-2xl p-8 text-white shadow-xl h-full">
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

          {/* Pay with Cash App */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-[#081A36] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#FF6A00]" />Pay with Cash App
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Send your payment directly, then upload proof below</p>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cash App ID</p>
                    <p className="text-xl font-black text-[#081A36]">{CASHAPP_ID}</p>
                  </div>
                  <button
                    onClick={copyCashAppId}
                    className="flex items-center gap-1.5 text-xs font-bold border border-slate-300 hover:border-[#FF6A00] hover:bg-[#FF6A00]/5 text-slate-700 px-3 py-2 rounded-lg"
                  >
                    {copied ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Memo</p>
                  <p className="text-sm text-slate-700">Payment for Property Inspections (include your Order # if available).</p>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                After sending your payment, please upload your payment receipt/screenshot below so we can verify and process your order. Thank you!
              </p>

              {formMsg && (
                <div className={`rounded-xl p-3 flex items-start gap-2 border text-xs ${formMsg.kind === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"}`}>
                  {formMsg.kind === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  <span>{formMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Amount you paid ($)</label>
                  <input
                    type="number" min="1" step="0.01" value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Order # (if available)</label>
                  <input
                    type="text" value={payOrderNumber}
                    onChange={(e) => setPayOrderNumber(e.target.value)}
                    placeholder="e.g. ORD-1234"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Payment receipt / screenshot</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" id="receipt-upload" />
                {receiptPreview ? (
                  <div className="flex items-center gap-3">
                    <img src={receiptPreview} alt="Receipt preview" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-600 truncate">{receiptFile?.name}</p>
                      <label htmlFor="receipt-upload" className="text-xs text-[#FF6A00] font-semibold hover:underline cursor-pointer">Choose a different file</label>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="receipt-upload" className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-[#FF6A00] rounded-xl py-6 cursor-pointer text-slate-400 hover:text-[#FF6A00] transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">Click to upload screenshot</span>
                  </label>
                )}
              </div>

              <button
                onClick={submitPaymentProof}
                disabled={submitting}
                className="w-full bg-[#FF6A00] hover:bg-[#FF8C1A] text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Payment Proof"}
              </button>
            </div>

            {myCashAppSubmissions.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Your submissions</p>
                <div className="space-y-2">
                  {myCashAppSubmissions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {tx.receiptUrl ? (
                          <a href={tx.receiptUrl} target="_blank" rel="noopener noreferrer">
                            <img src={tx.receiptUrl} alt="Receipt" className="w-8 h-8 object-cover rounded border border-slate-200" />
                          </a>
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-slate-400" /></div>
                        )}
                        <span className="text-slate-700 truncate">${Number(tx.amount).toFixed(2)}{tx.orderNumber ? ` · #${tx.orderNumber}` : ""}</span>
                      </div>
                      {tx.status === "pending" ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0"><Clock className="w-3 h-3" /> Pending</span>
                      ) : tx.status === "confirmed" ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0"><CheckCircle className="w-3 h-3" /> Confirmed</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">Cancelled</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-[#081A36]">Transaction History</h3>
            <button onClick={() => fetchAll()} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
          ) : confirmedTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No confirmed transactions yet</p>
              <p className="text-xs mt-1">Payments show up here once they're confirmed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Transaction Type</th>
                    <th className="px-4 py-3">Credit Amount</th>
                    <th className="px-4 py-3">Debit Amount</th>
                    <th className="px-4 py-3">Remaining Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {confirmedTransactions.map((tx) => {
                    const isCredit = CREDIT_TYPES.has(tx.type);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap" suppressHydrationWarning>
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {TX_TYPE_LABEL[tx.type] ?? tx.type}
                          {tx.description && <p className="text-xs text-slate-400 mt-0.5">{tx.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {isCredit ? (
                            <span className="inline-block font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                              +${Number(tx.amount).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!isCredit ? (
                            <span className="inline-block font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-lg">
                              -${Number(tx.amount).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                          ${Number(tx.balanceAfter).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ClientPortalShell>
  );
}
