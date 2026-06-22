"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Camera, MapPin, Clock, CheckCircle, RefreshCw, Upload, X,
  User, Wifi, WifiOff, DollarSign, Star, ToggleLeft, ToggleRight,
  Edit3, Save, Car, AlertCircle, Zap, Package, Image as ImageIcon, Trash2,
} from "lucide-react";

interface Photo { id: string; filename: string; url: string; description: string; selectedByClient: boolean; }
interface Order {
  id: string; address: string; status: string; totalPrice: number; compensationAmount: number;
  serviceType: string; turnaroundTier: string; notes: string; customizeNotes: string;
  photos: Photo[]; createdAt: string; offerSentAt: string | null; offerAcceptedAt: string | null;
  client?: { name: string; email: string } | null; assignedAgentId: string | null;
}
interface AgentProfile {
  id: string; name: string; email: string; phone: string; bio: string;
  coverageZone: string; vehicle: string; available: boolean; rating: number;
  totalEarnings: number; pendingPayout: number; completedJobs: number;
}

const TIER_LABELS: Record<string, string> = { standard: "Next Business Day", rush_24hr: "24-Hour Rush", rush_6hr: "6-Hour Rush" };
const TIER_HOURS: Record<string, number> = { standard: 24, rush_24hr: 24, rush_6hr: 6 };

function Countdown({ from, hours, label }: { from: string; hours: number; label: string }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const update = () => {
      const deadline = new Date(new Date(from).getTime() + hours * 3600000);
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) { setRemaining("Overdue"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m`);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [from, hours]);
  const overdue = remaining === "Overdue";
  const urgent = !overdue && parseInt(remaining) < 2;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${overdue ? "bg-red-100 text-red-700" : urgent ? "bg-amber-100 text-amber-700" : "bg-green-50 text-green-700"}`}>
      <Clock className="w-3 h-3" /> {label}: {remaining}
    </span>
  );
}

export default function AgentPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"mine" | "offers" | "profile">("mine");
  const [acting, setActing] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // Photo upload state
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ bio: "", coverageZone: "", vehicle: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchProfile = useCallback(async (id: string) => {
    const r = await fetch(`/_api/agents/${id}`);
    const d = await r.json();
    if (d.agent) {
      setProfile(d.agent);
      setProfileForm({ bio: d.agent.bio, coverageZone: d.agent.coverageZone, vehicle: d.agent.vehicle, phone: d.agent.phone });
    }
  }, []);

  useEffect(() => {
    fetch("/_api/auth/me").then(r => r.json()).then(d => {
      if (d.user) fetchProfile(d.user.id);
    });
    const es = new EventSource("/_api/events");
    esRef.current = es;
    es.addEventListener("connected", () => setLiveConnected(true));
    es.addEventListener("orders", (e) => { setOrders(JSON.parse(e.data) as Order[]); setLoading(false); });
    es.onerror = () => setLiveConnected(false);
    return () => { es.close(); };
  }, [fetchProfile]);

  async function toggleAvailability() {
    if (!profile) return;
    setTogglingAvail(true);
    await fetch(`/_api/agents/${profile.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !profile.available }),
    });
    setProfile(p => p ? { ...p, available: !p.available } : p);
    setTogglingAvail(false);
  }

  async function acceptJob(orderId: string) {
    setActing(orderId);
    await fetch(`/_api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accept: true }) });
    setActing(null);
  }

  async function declineJob(orderId: string) {
    setActing(orderId);
    await fetch(`/_api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decline: true }) });
    setActing(null);
  }

  async function completeJob(orderId: string) {
    setActing(orderId);
    await fetch(`/_api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" }) });
    setActing(null);
    if (profile) fetchProfile(profile.id);
  }

  async function uploadPhoto(orderId: string, file: File) {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const url = reader.result as string;
      await fetch(`/_api/orders/${orderId}/photos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, url, description: uploadDesc }),
      });
      setUploadingFor(null); setUploadDesc(""); setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function deletePhoto(orderId: string, photoId: string) {
    await fetch(`/_api/orders/${orderId}/photos`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photoId }) });
  }

  async function saveProfile() {
    if (!profile) return;
    setSavingProfile(true);
    await fetch(`/_api/agents/${profile.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profileForm) });
    setProfile(p => p ? { ...p, ...profileForm } : p);
    setEditingProfile(false); setSavingProfile(false);
  }

  async function logout() { await fetch("/_api/auth/logout", { method: "POST" }); router.push("/"); }

  const myJobs = orders.filter(o => o.assignedAgentId === profile?.id && o.status === "in_progress");
  const offers = orders.filter(o => o.status === "pending" && o.assignedAgentId === null);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center text-base font-bold">📷</span>
          <span className="font-bold text-slate-900">FieldFlow</span>
          <span className="text-xs bg-green-50 text-green-600 border border-green-100 rounded-full px-2 py-0.5 font-medium">Agent Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${liveConnected ? "bg-green-50 text-green-600 border-green-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
            {liveConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {liveConnected ? "Live" : "Connecting…"}
          </div>
          <span className="text-sm text-slate-600">Welcome, <span className="font-semibold">{profile?.name ?? "Agent"}</span></span>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Availability toggle — prominent */}
        {profile && (
          <div className={`rounded-2xl p-5 mb-6 border-2 flex items-center justify-between transition-all ${profile.available ? "bg-green-50 border-green-200" : "bg-slate-100 border-slate-200"}`}>
            <div>
              <p className={`font-bold text-lg ${profile.available ? "text-green-800" : "text-slate-600"}`}>
                {profile.available ? "✓ You're Available" : "You're Unavailable"}
              </p>
              <p className={`text-sm ${profile.available ? "text-green-600" : "text-slate-400"}`}>
                {profile.available ? "Job offers will be sent to you • Respond within 3 hours" : "You won't receive new job offers until you toggle on"}
              </p>
            </div>
            <button onClick={toggleAvailability} disabled={togglingAvail}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${profile.available ? "bg-green-600 hover:bg-green-700 text-white" : "bg-slate-600 hover:bg-slate-700 text-white"}`}>
              {profile.available ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {togglingAvail ? "Saving…" : profile.available ? "Toggle Off" : "Go Available"}
            </button>
          </div>
        )}

        {/* Stats */}
        {profile && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Active Jobs", val: myJobs.length, color: "text-blue-600" },
              { label: "Open Offers", val: offers.length, color: "text-amber-600" },
              { label: "Completed", val: profile.completedJobs, color: "text-green-600" },
              { label: "Pending Payout", val: `$${profile.pendingPayout}`, color: "text-purple-600" },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                <div className={`text-2xl font-bold ${color}`}>{val}</div>
                <div className="text-xs text-slate-400 mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Rating */}
        {profile && (
          <div className="flex items-center gap-3 mb-6 bg-white rounded-xl px-4 py-3 border border-slate-100">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(n => (
                <Star key={n} className={`w-5 h-5 ${n <= Math.round(profile.rating) ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
              ))}
            </div>
            <span className="font-bold text-slate-800">{profile.rating.toFixed(1)}</span>
            <span className="text-sm text-slate-400">· {profile.completedJobs} jobs completed · Total earned: <span className="font-semibold text-slate-700">${profile.totalEarnings}</span></span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          {([["mine", "My Active Jobs", myJobs.length], ["offers", "Job Offers", offers.length], ["profile", "My Profile", ""]] as const).map(([t, label, count]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {label}
              {count !== "" && count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${t === "offers" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{count}</span>}
            </button>
          ))}
        </div>

        {/* My Active Jobs */}
        {activeTab === "mine" && (
          <div className="space-y-4">
            {loading ? <div className="text-slate-400 text-center py-12">Loading…</div>
              : myJobs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                  <Camera className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No active jobs</p>
                  <p className="text-slate-400 text-sm mt-1">Check the Job Offers tab to accept new work</p>
                </div>
              ) : myJobs.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            <RefreshCw className="w-3 h-3" /> In Progress
                          </span>
                          {order.turnaroundTier !== "standard" && (
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 font-medium px-2 py-0.5 rounded-full">
                              <Zap className="w-3 h-3" /> {TIER_LABELS[order.turnaroundTier]}
                            </span>
                          )}
                          {order.offerAcceptedAt && (
                            <Countdown from={order.offerAcceptedAt} hours={TIER_HOURS[order.turnaroundTier] ?? 24} label="Complete by" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          {order.address}
                        </div>
                        {order.client && <p className="text-xs text-slate-400 mt-1">Client: {order.client.name}</p>}
                        {order.customizeNotes && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                            <span className="font-medium">Customize instructions:</span> {order.customizeNotes}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-slate-400">Your pay</div>
                        <div className="text-xl font-bold text-green-600">${order.compensationAmount}</div>
                      </div>
                    </div>

                    {/* Photos uploaded */}
                    {order.photos.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-slate-500 mb-2">{order.photos.length} photo{order.photos.length !== 1 ? "s" : ""} uploaded</p>
                        <div className="flex gap-2 flex-wrap">
                          {order.photos.map(ph => (
                            <div key={ph.id} className="relative group">
                              {ph.url.startsWith("data:") ? (
                                <img src={ph.url} alt={ph.description} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                              ) : (
                                <div className="w-16 h-16 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                                  <ImageIcon className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                              <button onClick={() => deletePhoto(order.id, ph.id)}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload / Actions */}
                    {uploadingFor === order.id ? (
                      <div className="border border-blue-200 rounded-xl p-3 bg-blue-50 space-y-2">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(order.id, f); }} />
                        <input value={uploadDesc} onChange={e => setUploadDesc(e.target.value)}
                          placeholder="Photo description (optional)…"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <div className="flex gap-2">
                          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            <Upload className="w-4 h-4" /> {uploading ? "Uploading…" : "Choose Photo"}
                          </button>
                          <button onClick={() => { setUploadingFor(null); setUploadDesc(""); }}
                            className="px-3 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => setUploadingFor(order.id)}
                          className="flex items-center gap-1.5 text-sm border border-slate-200 text-slate-700 font-medium px-3 py-2 rounded-xl hover:bg-slate-50">
                          <Upload className="w-4 h-4" /> Upload Photo
                        </button>
                        <button onClick={() => completeJob(order.id)} disabled={acting === order.id}
                          className="flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-xl disabled:opacity-50">
                          <CheckCircle className="w-4 h-4" /> {acting === order.id ? "Saving…" : "Mark Complete"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Job Offers */}
        {activeTab === "offers" && (
          <div className="space-y-4">
            {!profile?.available && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                You&apos;re currently unavailable. Toggle your availability to see and accept new offers.
              </div>
            )}
            {loading ? <div className="text-slate-400 text-center py-12">Loading…</div>
              : offers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No open job offers</p>
                  <p className="text-slate-400 text-sm mt-1">New offers appear here in real-time</p>
                </div>
              ) : offers.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {order.turnaroundTier !== "standard" ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${order.turnaroundTier === "rush_6hr" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                            <Zap className="w-3 h-3" /> {TIER_LABELS[order.turnaroundTier]}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-50 text-slate-600 border border-slate-200 font-medium px-2 py-0.5 rounded-full">
                            <Package className="w-3 h-3" /> Standard
                          </span>
                        )}
                        <span className="text-xs text-slate-400 capitalize">{order.serviceType.replace(/_/g, " ")}</span>
                        {order.offerSentAt && (
                          <Countdown from={order.offerSentAt} hours={3} label="Offer expires" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 mb-1">
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        {order.address}
                      </div>
                      {order.notes && <p className="text-xs text-slate-400">{order.notes}</p>}
                      {order.customizeNotes && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                          <span className="font-medium">Custom instructions:</span> {order.customizeNotes}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-slate-400">Compensation</div>
                      <div className="text-2xl font-bold text-green-600">${order.compensationAmount}</div>
                      <div className="text-xs text-slate-400">of ${order.totalPrice} order</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button onClick={() => declineJob(order.id)} disabled={acting === order.id || !profile?.available}
                      className="flex-1 border border-slate-200 text-slate-600 font-medium py-2 rounded-xl hover:bg-slate-50 text-sm disabled:opacity-40">
                      Decline
                    </button>
                    <button onClick={() => acceptJob(order.id)} disabled={acting === order.id || !profile?.available}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-medium py-2 rounded-xl text-sm flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> {acting === order.id ? "Accepting…" : `Accept — $${order.compensationAmount}`}
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Profile */}
        {activeTab === "profile" && profile && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">My Profile</h3>
              {!editingProfile ? (
                <button onClick={() => setEditingProfile(true)} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700">
                  <Edit3 className="w-4 h-4" /> Edit
                </button>
              ) : (
                <button onClick={saveProfile} disabled={savingProfile} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white font-medium px-3 py-1.5 rounded-lg">
                  <Save className="w-4 h-4" /> {savingProfile ? "Saving…" : "Save Changes"}
                </button>
              )}
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Name</label>
                  <p className="font-medium text-slate-800">{profile.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Email</label>
                  <p className="font-medium text-slate-800">{profile.email}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Phone</label>
                  {editingProfile ? (
                    <input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  ) : <p className="font-medium text-slate-800">{profile.phone}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Car className="w-3 h-3" /> Vehicle</label>
                  {editingProfile ? (
                    <input value={profileForm.vehicle} onChange={e => setProfileForm(f => ({ ...f, vehicle: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  ) : <p className="font-medium text-slate-800">{profile.vehicle}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Coverage Zone</label>
                {editingProfile ? (
                  <input value={profileForm.coverageZone} onChange={e => setProfileForm(f => ({ ...f, coverageZone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                ) : <p className="font-medium text-slate-800">{profile.coverageZone}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Bio</label>
                {editingProfile ? (
                  <textarea value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                    rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                ) : <p className="text-slate-700 text-sm leading-relaxed">{profile.bio || "No bio added yet."}</p>}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-green-700">${profile.totalEarnings}</div>
                  <div className="text-xs text-green-600">Total Earned</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-purple-700">${profile.pendingPayout}</div>
                  <div className="text-xs text-purple-600">Pending Payout</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-blue-700">{profile.completedJobs}</div>
                  <div className="text-xs text-blue-600">Jobs Done</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
