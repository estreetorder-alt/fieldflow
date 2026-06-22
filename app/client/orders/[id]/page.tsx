"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Camera, MapPin, Clock, CheckCircle, RefreshCw,
  XCircle, DollarSign, User, FileText, Download, Calendar,
  AlertCircle,
} from "lucide-react";

interface StatusEvent {
  status: string;
  timestamp: string;
  note: string;
}

interface Order {
  id: string;
  address: string;
  status: string;
  totalPrice: number;
  serviceType: string;
  turnaroundTier: string;
  notes: string;
  photos: string[];
  createdAt: string;
  statusHistory: StatusEvent[];
  client?: { name: string; email: string; phone: string } | null;
  agent?: { name: string; email: string; phone: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  in_progress: <RefreshCw className="w-4 h-4" />,
  completed: <CheckCircle className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />,
};

const TIMELINE_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-400",
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(async (res) => {
        if (res.status === 401) { router.push("/login"); return; }
        if (res.status === 403 || res.status === 404) { setError("Order not found or access denied."); setLoading(false); return; }
        const data = await res.json();
        setOrder(data.order);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load order."); setLoading(false); });
  }, [id, router]);

  function handleDownload() {
    window.open(`/api/orders/${id}/report`, "_blank");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400">Loading order…</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-red-100 rounded-2xl p-10 text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-800 mb-1">Order not found</h2>
          <p className="text-sm text-slate-500 mb-5">{error}</p>
          <Link href="/client" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            ← Back to my orders
          </Link>
        </div>
      </div>
    );
  }

  const isComplete = order.status === "completed";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/client"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">My Orders</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-700">{order.id}</span>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Report
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>
                {STATUS_ICONS[order.status]}
                {order.status.replace("_", " ")}
              </span>
              {order.turnaroundTier !== "standard" && (
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 font-semibold px-2.5 py-1 rounded-full">
                  {order.turnaroundTier === "rush_6hr" ? "⚡ 6-Hour Rush" : "⚡ 24-Hour Rush"}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              {order.address}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Submitted {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-3xl font-black text-slate-900">${order.totalPrice}</div>
            <div className="text-xs text-slate-400 mt-0.5 capitalize">{order.serviceType} · {order.turnaroundTier?.replace("_", " ")}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Status Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Status History</h2>
              </div>
              <div className="p-6">
                {order.statusHistory.length === 0 ? (
                  <p className="text-sm text-slate-400">No history yet.</p>
                ) : (
                  <ol className="relative border-l-2 border-slate-100 ml-2 space-y-6">
                    {[...order.statusHistory].reverse().map((ev, i) => (
                      <li key={i} className="ml-5">
                        <div className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white ${TIMELINE_DOT[ev.status] ?? "bg-slate-300"}`} />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border w-fit ${STATUS_COLORS[ev.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            {STATUS_ICONS[ev.status]}
                            {ev.status.replace("_", " ")}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(ev.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1.5">{ev.note}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* Photos */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">
                  Photos
                  {order.photos.length > 0 && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                      {order.photos.length}
                    </span>
                  )}
                </h2>
              </div>
              <div className="p-6">
                {order.photos.length === 0 ? (
                  <div className="text-center py-8">
                    <Camera className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">
                      {isComplete
                        ? "No photos were uploaded for this order."
                        : "Photos will appear here once your agent begins the inspection."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {order.photos.map((photo, i) => (
                      <div
                        key={i}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-2 text-center"
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Camera className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-xs text-slate-600 font-medium break-all leading-tight">{photo}</p>
                        <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Uploaded
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900">Special Instructions</h2>
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-3 text-sm text-slate-600 leading-relaxed">
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    {order.notes}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column — summary cards */}
          <div className="space-y-4">
            {/* Pricing */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 capitalize">{order.serviceType}</span>
                  <span className="font-medium text-slate-700">
                    ${order.totalPrice}
                  </span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="font-bold text-slate-900 text-lg">${order.totalPrice}</span>
                </div>
              </div>
            </div>

            {/* Agent */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Field Agent</h3>
              {order.agent ? (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{order.agent.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{order.agent.email}</div>
                    {order.agent.phone && (
                      <div className="text-xs text-slate-400">{order.agent.phone}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <User className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Agent not yet assigned</p>
                  <p className="text-xs text-slate-300 mt-1">We&apos;ll notify you when one is dispatched</p>
                </div>
              )}
            </div>

            {/* Completion CTA */}
            {isComplete && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-900 mb-1">Inspection Complete</h3>
                <p className="text-xs text-green-700 mb-4">
                  Your report is ready with {order.photos.length} photo{order.photos.length !== 1 ? "s" : ""}.
                </p>
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Full Report
                </button>
              </div>
            )}

            {/* Price icon */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Payment is collected after the inspection is completed and verified.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
