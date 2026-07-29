"use client";
import { useEffect, useRef, useState } from "react";
import {
  MessageCircle, FileText, Clock, ShieldCheck, Ticket, LifeBuoy,
  ChevronDown, ChevronRight, ChevronLeft, Mail, Phone, BookOpen, Lock, ArrowUpRight,
} from "lucide-react";
import SupportWidget, { type SupportWidgetHandle } from "./SupportWidget";
import type { SupportListItem } from "@/lib/supportChat";

const CATEGORY_LABEL: Record<string, string> = {
  order_issue: "Order Issue",
  payment: "Payment",
  billing: "Billing",
  coverage: "Coverage",
  technical: "Technical",
  general: "General",
};

const STATUS_STYLE: Record<string, string> = {
  open: "bg-[#FFF1E6] text-[#B15400]",
  in_progress: "bg-blue-50 text-blue-600",
  handed_off: "bg-blue-50 text-blue-600",
  resolved: "bg-emerald-50 text-emerald-600",
  closed: "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  handed_off: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const FAQS = [
  { q: "How long does delivery take after order completion?", a: "Most orders are delivered within 24–48 hours of the field visit being completed, depending on report complexity." },
  { q: "How are invoices generated?", a: "Invoices are generated automatically once an order is marked complete and are available under Billing & Wallet." },
  { q: "How do I update my order details?", a: "Open the order from your dashboard and use Edit Order — changes are reflected for the assigned photographer immediately." },
  { q: "When are photographers paid?", a: "Photographers are paid out on a weekly cycle after the order they completed has been reviewed and accepted." },
  { q: "What if my photographer doesn't arrive?", a: "Submit a request with your order number and we'll reassign coverage and follow up with you directly." },
  { q: "How do I become a Snapect photographer?", a: "Reach out via Submit a Request with \"Coverage\" as the category and our team will start the onboarding process." },
];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-[var(--brand-border)] rounded-2xl p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-[#FF6A00]/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#FF6A00]" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--brand-ink-soft)]">{label}</p>
        <p className="text-lg font-bold text-[var(--brand-navy)] leading-tight">{value}</p>
        <p className="text-[11px] text-[var(--brand-ink-faint)] leading-snug">{sub}</p>
      </div>
    </div>
  );
}

export default function SupportCenterPage({ pageSize = 5 }: { pageSize?: number }) {
  const supportRef = useRef<SupportWidgetHandle>(null);
  const [tab, setTab] = useState<"requests" | "chats" | "faq">("requests");
  const [items, setItems] = useState<SupportListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/support/list?page=${page}&pageSize=${pageSize}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, pageSize]);

  const rows = tab === "chats" ? items.filter((i) => i.kind === "chat") : items;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <SupportWidget ref={supportRef} hideTrigger />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--brand-navy)] font-[family-name:var(--font-jakarta)]">Support Center</h1>
          <p className="text-sm text-[var(--brand-ink-soft)] mt-1">We&apos;re here to help! Choose an option below or view your previous requests.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => supportRef.current?.open("chat")}
            className="flex items-center gap-2 border border-[var(--brand-border)] hover:border-[#FF6A00] text-[var(--brand-navy)] font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-[#FF6A00]" /> Chat with an Agent
          </button>
          <button
            onClick={() => supportRef.current?.open("request")}
            className="flex items-center gap-2 bg-[#FF6A00] hover:bg-[#FF8C1A] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <FileText className="w-4 h-4" /> Submit a Request
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Average Response Time" value="Under 5 Minutes" sub="We typically respond quickly" />
        <StatCard icon={ShieldCheck} label="Customer Satisfaction" value="98.7%" sub="Based on recent reviews" />
        <StatCard icon={Ticket} label="Resolved This Week" value="—" sub="Tickets resolved" />
        <StatCard icon={LifeBuoy} label="Support Availability" value="24/7" sub="We're always here" />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="bg-white border border-[var(--brand-border)] rounded-2xl overflow-hidden">
          <div className="flex border-b border-[var(--brand-border)] px-2">
            {[
              { key: "requests", label: "My Requests" },
              { key: "chats", label: "Live Chat History" },
              { key: "faq", label: "FAQ" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as typeof tab)}
                className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                  tab === t.key ? "border-[#FF6A00] text-[#FF6A00]" : "border-transparent text-[var(--brand-ink-soft)] hover:text-[var(--brand-navy)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab !== "faq" ? (
            <div>
              <div className="px-5 pt-4 pb-2">
                <h2 className="font-bold text-[var(--brand-navy)]">{tab === "chats" ? "Live Chat History" : "My Support Requests"}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--brand-ink-faint)] border-y border-[var(--brand-border)]">
                      <th className="px-5 py-2 font-semibold">ID</th>
                      <th className="px-5 py-2 font-semibold">Subject</th>
                      <th className="px-5 py-2 font-semibold">Type</th>
                      <th className="px-5 py-2 font-semibold">Status</th>
                      <th className="px-5 py-2 font-semibold">Last Updated</th>
                      <th className="px-5 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={6} className="px-5 py-6 text-center text-[var(--brand-ink-faint)] text-sm">Loading…</td></tr>
                    )}
                    {!loading && rows.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-6 text-center text-[var(--brand-ink-faint)] text-sm">Nothing here yet.</td></tr>
                    )}
                    {!loading && rows.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--brand-border)] last:border-0 hover:bg-slate-50">
                        <td className="px-5 py-3 font-mono text-xs text-[var(--brand-ink-soft)]">{r.id}</td>
                        <td className="px-5 py-3 text-[var(--brand-navy)]">{r.subject || (r.kind === "chat" ? "Live chat" : "Support request")}</td>
                        <td className="px-5 py-3 text-[var(--brand-ink-soft)]">{CATEGORY_LABEL[r.category] ?? "General"}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_STYLE[r.status] ?? "bg-slate-100 text-slate-500"}`}>
                            {STATUS_LABEL[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[var(--brand-ink-soft)] whitespace-nowrap">{fmtDate(r.updatedAt)}</td>
                        <td className="px-5 py-3 text-right"><ChevronRight className="w-4 h-4 text-[var(--brand-ink-faint)] inline" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--brand-border)]">
                <p className="text-xs text-[var(--brand-ink-faint)]">
                  {total === 0 ? "No requests yet" : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, total)} of ${total} requests`}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="w-8 h-8 rounded-lg border border-[var(--brand-border)] flex items-center justify-center disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg border text-xs font-bold flex items-center justify-center ${
                        p === page ? "border-[#FF6A00] text-[#FF6A00]" : "border-[var(--brand-border)] text-[var(--brand-ink-soft)]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="w-8 h-8 rounded-lg border border-[var(--brand-border)] flex items-center justify-center disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-2">
              {FAQS.map((f, i) => (
                <div key={i} className="border border-[var(--brand-border)] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-[var(--brand-navy)] hover:bg-slate-50"
                  >
                    {f.q}
                    <ChevronDown className={`w-4 h-4 shrink-0 text-[var(--brand-ink-faint)] transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && <p className="px-4 pb-3 text-sm text-[var(--brand-ink-soft)]">{f.a}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-[var(--brand-border)] rounded-2xl p-5">
            <h3 className="font-bold text-[var(--brand-navy)]">How can we help you today?</h3>
            <p className="text-xs text-[var(--brand-ink-soft)] mt-1 mb-4">Choose the best option and our team will get back to you.</p>

            <div className="bg-slate-50 rounded-xl p-4 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#FF6A00]/10 flex items-center justify-center mb-2">
                <MessageCircle className="w-4 h-4 text-[#FF6A00]" />
              </div>
              <p className="text-sm font-bold text-[var(--brand-navy)]">Chat with an Agent</p>
              <p className="text-xs text-[var(--brand-ink-soft)] mb-3">Start a live conversation with our support team.</p>
              <button onClick={() => supportRef.current?.open("chat")} className="text-xs font-bold text-[#FF6A00] hover:underline flex items-center gap-1">
                Start Live Chat <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <div className="w-9 h-9 rounded-lg bg-[#FF6A00]/10 flex items-center justify-center mb-2">
                <FileText className="w-4 h-4 text-[#FF6A00]" />
              </div>
              <p className="text-sm font-bold text-[var(--brand-navy)]">Submit a Request</p>
              <p className="text-xs text-[var(--brand-ink-soft)] mb-3">Submit a request and we&apos;ll get back to you.</p>
              <button onClick={() => supportRef.current?.open("request")} className="text-xs font-bold text-[#FF6A00] hover:underline flex items-center gap-1">
                Create Request <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-[var(--brand-border)] rounded-2xl p-4 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-[var(--brand-ink-soft)] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[var(--brand-navy)]">Your data is safe with us</p>
              <p className="text-[11px] text-[var(--brand-ink-faint)]">We use industry-standard security to protect your information.</p>
            </div>
          </div>

          <div className="bg-white border border-[var(--brand-border)] rounded-2xl p-5">
            <h3 className="font-bold text-[var(--brand-navy)] mb-3">Other Ways to Reach Us</h3>
            <a href="mailto:info@snapect.com" className="flex items-center gap-2.5 py-1.5 text-sm text-[var(--brand-ink-soft)] hover:text-[var(--brand-navy)]">
              <Mail className="w-4 h-4" />
              <span>
                Email Support<br /><span className="text-xs text-[var(--brand-ink-faint)]">info@snapect.com</span>
              </span>
            </a>
            <a href="tel:+17869526816" className="flex items-center gap-2.5 py-1.5 text-sm text-[var(--brand-ink-soft)] hover:text-[var(--brand-navy)]">
              <Phone className="w-4 h-4" />
              <span>
                Call Us<br /><span className="text-xs text-[var(--brand-ink-faint)]">+1 (786) 952-6816</span>
              </span>
            </a>
            <button onClick={() => setTab("faq")} className="w-full flex items-center gap-2.5 py-1.5 text-sm text-[var(--brand-ink-soft)] hover:text-[var(--brand-navy)] text-left">
              <BookOpen className="w-4 h-4" />
              <span>
                Help Resources<br /><span className="text-xs text-[var(--brand-ink-faint)]">Browse our help articles</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
