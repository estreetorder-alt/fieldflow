"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut, Plus, Camera, Clock, CheckCircle, RefreshCw, XCircle,
  MapPin, DollarSign, FileText, X, Wifi, WifiOff, ChevronRight,
  Zap, Package, List, Trash2, Mail, Download, Image, Square, CheckSquare,
} from "lucide-react";

interface Photo { id: string; filename: string; url: string; description: string; selectedByClient: boolean; }
interface Order {
  id: string; address: string; status: string; totalPrice: number; compensationAmount: number;
  serviceType: string; turnaroundTier: string; notes: string; customizeNotes: string;
  photos: Photo[]; photoExpiresAt: string | null; createdAt: string; invoicePaid: boolean;
  agent?: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />, in_progress: <RefreshCw className="w-3.5 h-3.5" />,
  completed: <CheckCircle className="w-3.5 h-3.5" />, cancelled: <XCircle className="w-3.5 h-3.5" />,
};
const TIER_INFO = {
  standard: { label: "Next Business Day", price_mul: 1.0, color: "border-slate-200 bg-white", sel: "border-blue-500 bg-blue-50", icon: <Package className="w-5 h-5" /> },
  rush_24hr: { label: "24-Hour Rush", price_mul: 1.25, color: "border-slate-200 bg-white", sel: "border-amber-400 bg-amber-50", icon: <Zap className="w-5 h-5 text-amber-500" /> },
  rush_6hr: { label: "6-Hour Rush", price_mul: 1.75, color: "border-slate-200 bg-white", sel: "border-red-400 bg-red-50", icon: <Zap className="w-5 h-5 text-red-500" /> },
};
const SERVICE_TYPES = [
  "inspection", "survey", "assessment", "bpo_photography",
  "occupancy_check", "construction_inspection", "disaster_inspection", "custom",
];
const BASE_PRICES: Record<string, number> = {
  inspection: 100, survey: 150, assessment: 200, bpo_photography: 120,
  occupancy_check: 80, construction_inspection: 175, disaster_inspection: 250, custom: 150,
};

function calcPrice(service: string, tier: string) {
  const mul = { standard: 1, rush_24hr: 1.25, rush_6hr: 1.75 }[tier] ?? 1;
  return Math.round((BASE_PRICES[service] ?? 100) * mul);
}

export default function ClientPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [userName, setUserName] = useState("Client");
  const [liveConnected, setLiveConnected] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const esRef = useRef<EventSource | null>(null);

  // Single-order form
  const [form, setForm] = useState({ address: "", serviceType: "inspection", turnaroundTier: "standard", notes: "", customizeNotes: "", customize: false });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Bulk mode
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkRows, setBulkRows] = useState([{ address: "", serviceType: "inspection", turnaroundTier: "standard" }]);

  // Photo selection
  const [expandedPhotos, setExpandedPhotos] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Record<string, Set<string>>>({});
  const [emailingOrder, setEmailingOrder] = useState<string | null>(null);

  const price = calcPrice(form.serviceType, form.turnaroundTier);

  useEffect(() => {
    fetch("/_api/auth/me").then(r => r.json()).then(d => { if (d.user) { setUserName(d.user.name); setUserId(d.user.id); } });
    const es = new EventSource("/_api/events");
    esRef.current = es;
    es.addEventListener("connected", () => setLiveConnected(true));
    es.addEventListener("orders", (e) => { setOrders(JSON.parse(e.data) as Order[]); setLoading(false); });
    es.onerror = () => setLiveConnected(false);
    return () => { es.close(); };
  }, []);

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault(); setFormError(""); setSubmitting(true);
    try {
      const body = bulkMode
        ? { orders: bulkRows.filter(r => r.address.trim()) }
        : { address: form.address, serviceType: form.serviceType, turnaroundTier: form.turnaroundTier, notes: form.notes, customizeNotes: form.customize ? form.customizeNotes : "" };
      const res = await fetch("/_api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); setFormError(d.error ?? "Failed to submit"); return; }
      setShowNewOrder(false);
      setForm({ address: "", serviceType: "inspection", turnaroundTier: "standard", notes: "", customizeNotes: "", customize: false });
      setBulkRows([{ address: "", serviceType: "inspection", turnaroundTier: "standard" }]);
      setBulkMode(false);
    } finally { setSubmitting(false); }
  }

  async function togglePhotoSelection(orderId: string, photoId: string) {
    setSelectedPhotos(prev => {
      const set = new Set(prev[orderId] ?? []);
      if (set.has(photoId)) set.delete(photoId); else set.add(photoId);
      return { ...prev, [orderId]: set };
    });
    const sel = new Set(selectedPhotos[orderId] ?? []);
    if (sel.has(photoId)) sel.delete(photoId); else sel.add(photoId);
    await fetch(`/_api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selectedPhotos: [...sel] }) });
  }

  async function emailSelectedPhotos(orderId: string) {
    setEmailingOrder(orderId);
    const sel = selectedPhotos[orderId] ?? new Set();
    await fetch("/_api/email-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, photoIds: [...sel] }) }).catch(() => {});
    setTimeout(() => { setEmailingOrder(null); alert("Email sent! (stub — real email coming soon)"); }, 800);
  }

  function downloadInvoice(orderId: string) { window.open(`/_api/orders/${orderId}/invoice`, "_blank"); }

  async function logout() { await fetch("/_api/auth/logout", { method: "POST" }); router.push("/"); }

  const myOrders = orders.filter(o => true); // Already filtered by API
  const stats = {
    total: myOrders.length, pending: myOrders.filter(o => o.status === "pending").length,
    inProgress: myOrders.filter(o => o.status === "in_progress").length,
    completed: myOrders.filter(o => o.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center text-base font-bold">📷</span>
          <span className="font-bold text-slate-900">FieldFlow</span>
          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5 font-medium">Client Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${liveConnected ? "bg-green-50 text-green-600 border-green-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
            {liveConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {liveConnected ? "Live" : "Connecting…"}
          </div>
          <span className="text-sm text-slate-600">Welcome, <span className="font-semibold text-slate-900">{userName}</span></span>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Orders", val: stats.total, color: "text-slate-700" },
            { label: "Pending", val: stats.pending, color: "text-amber-600" },
            { label: "In Progress", val: stats.inProgress, color: "text-blue-600" },
            { label: "Completed", val: stats.completed, color: "text-green-600" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
              <div className={`text-3xl font-bold ${color}`}>{val}</div>
              <div className="text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Orders section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">My Orders</h2>
          <button onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Request Inspection
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">Connecting to live feed…</div>
        ) : myOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <Camera className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No orders yet</p>
            <p className="text-slate-400 text-sm mt-1">Submit your first inspection request above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myOrders.map(order => {
              const tier = TIER_INFO[order.turnaroundTier as keyof typeof TIER_INFO];
              const photosExpanded = expandedPhotos === order.id;
              const selSet = selectedPhotos[order.id] ?? new Set();
              return (
                <div key={order.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <Link href={`/client/orders/${order.id}`}
                    className="block p-5 hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                            {STATUS_ICONS[order.status]} {order.status.replace("_", " ")}
                          </span>
                          {tier && (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${order.turnaroundTier === "rush_6hr" ? "bg-red-50 text-red-600 border-red-200" : order.turnaroundTier === "rush_24hr" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                              {tier.icon && <span className="w-3 h-3">{order.turnaroundTier !== "standard" ? "⚡" : ""}</span>}
                              {tier.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{order.address}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                          <span className="capitalize">{order.serviceType.replace(/_/g, " ")}</span>
                          <span suppressHydrationWarning>{new Date(order.createdAt).toLocaleDateString()}</span>
                          {order.agent && <span>Agent: <span className="text-slate-700 font-medium">{order.agent.name}</span></span>}
                          {order.photos.length > 0 && <span className="text-blue-600">{order.photos.length} photo{order.photos.length !== 1 ? "s" : ""}</span>}
                          {order.photoExpiresAt && (
                            <span className="text-amber-600">Photos expire {new Date(order.photoExpiresAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="font-bold text-slate-900 text-lg">${order.totalPrice}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{order.invoicePaid ? <span className="text-green-600 font-medium">Paid</span> : "Unpaid"}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </div>
                    {order.customizeNotes && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 italic flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {order.customizeNotes}
                      </div>
                    )}
                  </Link>

                  {/* Completed order actions */}
                  {order.status === "completed" && order.photos.length > 0 && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-3">
                      <div className="flex items-center justify-between mb-3">
                        <button onClick={() => setExpandedPhotos(photosExpanded ? null : order.id)}
                          className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-blue-600">
                          <Image className="w-4 h-4" />
                          {photosExpanded ? "Hide" : "View"} Photos ({order.photos.length})
                        </button>
                        <div className="flex items-center gap-2">
                          {selSet.size > 0 && (
                            <button onClick={() => emailSelectedPhotos(order.id)} disabled={emailingOrder === order.id}
                              className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-1.5 rounded-lg">
                              <Mail className="w-3.5 h-3.5" />
                              {emailingOrder === order.id ? "Sending…" : `Email ${selSet.size} selected`}
                            </button>
                          )}
                          <button onClick={() => downloadInvoice(order.id)}
                            className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg">
                            <Download className="w-3.5 h-3.5" /> Invoice
                          </button>
                        </div>
                      </div>
                      {photosExpanded && (
                        <div className="grid grid-cols-3 gap-2">
                          {order.photos.map(ph => {
                            const isSel = selSet.has(ph.id);
                            return (
                              <button key={ph.id} onClick={() => togglePhotoSelection(order.id, ph.id)}
                                className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${isSel ? "border-blue-500" : "border-slate-200 hover:border-slate-300"}`}>
                                {ph.url && ph.url.startsWith("data:") ? (
                                  <img src={ph.url} alt={ph.description} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-1">
                                    <Camera className="w-5 h-5 text-slate-400" />
                                    <span className="text-xs text-slate-400 px-2 text-center truncate w-full">{ph.filename}</span>
                                  </div>
                                )}
                                <div className={`absolute top-1.5 right-1.5 ${isSel ? "text-blue-600" : "text-white/70"}`}>
                                  {isSel ? <CheckSquare className="w-4 h-4 drop-shadow" /> : <Square className="w-4 h-4 drop-shadow" />}
                                </div>
                                {ph.description && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">{ph.description}</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {order.status === "completed" && order.photos.length === 0 && (
                    <div className="border-t border-slate-100 px-5 py-3 flex justify-end">
                      <button onClick={() => downloadInvoice(order.id)}
                        className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg">
                        <Download className="w-3.5 h-3.5" /> Download Invoice
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {showNewOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Request Inspection</h2>
                <p className="text-sm text-slate-400 mt-0.5">Submit one order or up to 50 in bulk</p>
              </div>
              <button onClick={() => setShowNewOrder(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitOrder} className="p-6 space-y-5">
              {formError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{formError}</div>}

              {/* Mode toggle */}
              <div className="flex gap-2">
                <button type="button" onClick={() => setBulkMode(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${!bulkMode ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200"}`}>
                  <FileText className="w-4 h-4" /> Single Order
                </button>
                <button type="button" onClick={() => setBulkMode(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${bulkMode ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200"}`}>
                  <List className="w-4 h-4" /> Bulk Orders
                </button>
              </div>

              {!bulkMode ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Property Address *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                        placeholder="123 Main St, City, IL 62701"
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Type *</label>
                      <select value={form.serviceType} onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {SERVICE_TYPES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                      <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Any special instructions…"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  {/* Turnaround tier */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Turnaround Time *</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(Object.entries(TIER_INFO) as [string, typeof TIER_INFO[keyof typeof TIER_INFO]][]).map(([key, info]) => {
                        const p = calcPrice(form.serviceType, key);
                        const isSelected = form.turnaroundTier === key;
                        return (
                          <button key={key} type="button" onClick={() => setForm(f => ({ ...f, turnaroundTier: key }))}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${isSelected ? info.sel : info.color + " hover:border-slate-300"}`}>
                            <div className="mb-1">{info.icon}</div>
                            <div className="font-semibold text-slate-800 text-sm">{info.label}</div>
                            <div className="text-lg font-bold text-blue-600 mt-1">${p}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customize toggle */}
                  <div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, customize: !f.customize }))}
                      className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-700">
                      <FileText className="w-4 h-4" />
                      {form.customize ? "Hide" : "Customize this order"} — specify exactly what to photograph
                    </button>
                    {form.customize && (
                      <textarea value={form.customizeNotes} onChange={e => setForm(f => ({ ...f, customizeNotes: e.target.value }))}
                        rows={3} placeholder="Describe exactly which areas, items, or angles you need photographed…"
                        className="mt-2 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    )}
                  </div>

                  {/* Live quote */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Order Total</p>
                      <p className="text-xs text-blue-500 mt-0.5">{TIER_INFO[form.turnaroundTier as keyof typeof TIER_INFO]?.label}</p>
                    </div>
                    <div className="text-3xl font-bold text-blue-700">${price}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    {bulkRows.map((row, i) => (
                      <div key={i} className="flex gap-2 items-start p-3 bg-slate-50 rounded-xl">
                        <div className="flex-1 space-y-2">
                          <input value={row.address} onChange={e => setBulkRows(rows => rows.map((r, j) => j === i ? { ...r, address: e.target.value } : r))}
                            placeholder={`Address ${i + 1} — e.g. 456 Oak Ave, Chicago, IL`}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <div className="flex gap-2">
                            <select value={row.serviceType} onChange={e => setBulkRows(rows => rows.map((r, j) => j === i ? { ...r, serviceType: e.target.value } : r))}
                              className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                              {SERVICE_TYPES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                            </select>
                            <select value={row.turnaroundTier} onChange={e => setBulkRows(rows => rows.map((r, j) => j === i ? { ...r, turnaroundTier: e.target.value } : r))}
                              className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                              <option value="standard">Standard</option>
                              <option value="rush_24hr">Rush 24hr</option>
                              <option value="rush_6hr">Rush 6hr</option>
                            </select>
                            <span className="text-xs font-bold text-blue-600 flex items-center px-1">${calcPrice(row.serviceType, row.turnaroundTier)}</span>
                          </div>
                        </div>
                        {bulkRows.length > 1 && (
                          <button type="button" onClick={() => setBulkRows(rows => rows.filter((_, j) => j !== i))} className="p-1.5 text-slate-400 hover:text-red-500 mt-0.5">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setBulkRows(rows => [...rows, { address: "", serviceType: "inspection", turnaroundTier: "standard" }])}
                      disabled={bulkRows.length >= 50}
                      className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700 disabled:opacity-40">
                      <Plus className="w-4 h-4" /> Add Address ({bulkRows.length}/50)
                    </button>
                    <div className="text-sm font-bold text-blue-700">
                      Total: ${bulkRows.reduce((sum, r) => sum + calcPrice(r.serviceType, r.turnaroundTier), 0)}
                    </div>
                  </div>
                </>
              )}

              <button type="submit" disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                {submitting ? "Submitting…" : <><DollarSign className="w-4 h-4" />{bulkMode ? `Submit ${bulkRows.filter(r => r.address).length} Orders` : `Submit Order — $${price}`}</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
