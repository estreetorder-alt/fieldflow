"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Ghost, UserPlus, ShieldCheck, Clock, CheckCircle, XCircle,
  Copy, RefreshCw, Users,
} from "lucide-react";

interface AgentRow {
  id: string; name: string; email?: string; agentType: "self_registered" | "ghost";
  ghostAdminLabel?: string; ghostConvertedToUserId?: string | null;
  coverageZone?: string; available?: boolean; suspended?: boolean; rating?: number; completedJobs?: number;
}
interface SignupRow {
  id: string; name: string; email: string; role: string; phone?: string; company?: string; createdAt?: string;
}
interface SubAdminRow {
  id: string; name: string; email: string; role: string; mustChangePassword: boolean; suspended: boolean; createdAt?: string;
}

const SUB_ADMIN_LABELS: Record<string, string> = {
  admin: "Full Admin",
  sub_admin_orders: "Sub-Admin — Orders",
  sub_admin_users: "Sub-Admin — User Management",
  sub_admin_finance: "Sub-Admin — Finance",
  sub_admin_support: "Sub-Admin — Support",
};

export default function AdminTeamPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"ghosts" | "signups" | "subadmins">("ghosts");

  // Ghost agents
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [ghostForm, setGhostForm] = useState({ name: "", ghostAdminLabel: "", coverageZone: "", phone: "" });
  const [creatingGhost, setCreatingGhost] = useState(false);
  const [ghostMsg, setGhostMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [convertFor, setConvertFor] = useState<AgentRow | null>(null);
  const [convertEmail, setConvertEmail] = useState("");
  const [convertResult, setConvertResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [converting, setConverting] = useState(false);

  // Pending signups
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [rejectFor, setRejectFor] = useState<SignupRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [signupBusy, setSignupBusy] = useState<string | null>(null);

  // Sub-admins
  const [subAdmins, setSubAdmins] = useState<SubAdminRow[]>([]);
  const [subForm, setSubForm] = useState({ name: "", email: "", role: "sub_admin_orders" });
  const [creatingSub, setCreatingSub] = useState(false);
  const [subResult, setSubResult] = useState<{ email: string; tempPassword: string } | null>(null);

  const fetchGhosts = useCallback(async () => {
    const r = await fetch("/api/agents/ghost");
    if (r.ok) { const d = await r.json(); setAgents(d.agents ?? []); }
  }, []);
  const fetchSignups = useCallback(async () => {
    const r = await fetch("/api/admin/signups");
    if (r.ok) { const d = await r.json(); setSignups(d.signups ?? []); }
  }, []);
  const fetchSubAdmins = useCallback(async () => {
    const r = await fetch("/api/admin/sub-admins");
    if (r.ok) { const d = await r.json(); setSubAdmins(d.accounts ?? []); }
  }, []);

  useEffect(() => { fetchGhosts(); fetchSignups(); fetchSubAdmins(); }, [fetchGhosts, fetchSignups, fetchSubAdmins]);

  async function createGhost(e: React.FormEvent) {
    e.preventDefault();
    setCreatingGhost(true); setGhostMsg(null);
    const r = await fetch("/api/agents/ghost", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ghostForm),
    });
    const d = await r.json();
    setCreatingGhost(false);
    if (!r.ok) { setGhostMsg({ text: d.error ?? "Failed to create ghost agent", ok: false }); return; }
    setGhostMsg({ text: `Ghost agent "${d.agent.name}" created`, ok: true });
    setGhostForm({ name: "", ghostAdminLabel: "", coverageZone: "", phone: "" });
    fetchGhosts();
  }

  async function submitConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!convertFor) return;
    setConverting(true);
    const r = await fetch("/api/agents/ghost/convert", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ghostId: convertFor.id, email: convertEmail }),
    });
    const d = await r.json();
    setConverting(false);
    if (!r.ok) { alert(d.error ?? "Conversion failed"); return; }
    setConvertResult({ email: d.agent.email, tempPassword: d.tempPassword });
    fetchGhosts();
  }

  async function reviewSignup(id: string, action: "approve" | "reject", reason?: string) {
    setSignupBusy(id);
    const r = await fetch(`/api/admin/signups/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    setSignupBusy(null);
    if (!r.ok) { const d = await r.json(); alert(d.error ?? "Failed"); return; }
    setRejectFor(null); setRejectReason("");
    fetchSignups();
  }

  async function createSubAdmin(e: React.FormEvent) {
    e.preventDefault();
    setCreatingSub(true); setSubResult(null);
    const r = await fetch("/api/admin/sub-admins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subForm),
    });
    const d = await r.json();
    setCreatingSub(false);
    if (!r.ok) { alert(d.error ?? "Failed to create account"); return; }
    setSubResult({ email: d.account.email, tempPassword: d.tempPassword });
    setSubForm({ name: "", email: "", role: "sub_admin_orders" });
    fetchSubAdmins();
  }

  const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400";
  const ghostAgents = agents.filter(a => a.agentType === "ghost");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto h-16 flex items-center gap-4">
          <button onClick={() => router.push("/admin")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#081A36]">
            <ArrowLeft className="w-4 h-4" />Back to Admin
          </button>
          <span className="text-xs bg-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded-full">Team &amp; Access</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
          {[
            ["ghosts", "Ghost Agents", <Ghost key="g" className="w-4 h-4" />],
            ["signups", "Pending Signups", <Clock key="c" className="w-4 h-4" />],
            ["subadmins", "Sub-Admin Accounts", <ShieldCheck key="s" className="w-4 h-4" />],
          ].map(([t, label, icon]) => (
            <button key={t as string} onClick={() => setTab(t as typeof tab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {icon}{label}
              {t === "signups" && signups.length > 0 && <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{signups.length}</span>}
            </button>
          ))}
        </div>

        {tab === "ghosts" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-1"><Ghost className="w-5 h-5 text-purple-600" />Create a Ghost Agent</h2>
              <p className="text-xs text-slate-400 mb-4">Coverage-gap solution — a local contact who never logs in. Admin bids and manages orders on their behalf. The admin label below is never shown to vendors, agents, or anyone but admin.</p>
              {ghostMsg && <div className={`mb-3 p-2.5 rounded-xl text-sm ${ghostMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{ghostMsg.text}</div>}
              <form onSubmit={createGhost} className="grid sm:grid-cols-2 gap-3">
                <input required placeholder="Display name (e.g. Mike Torres)" value={ghostForm.name} onChange={e => setGhostForm(f => ({ ...f, name: e.target.value }))} className={inp} />
                <input required placeholder="Admin-only label (e.g. John's cousin — Dallas TX)" value={ghostForm.ghostAdminLabel} onChange={e => setGhostForm(f => ({ ...f, ghostAdminLabel: e.target.value }))} className={inp} />
                <input placeholder="Coverage zone / zip" value={ghostForm.coverageZone} onChange={e => setGhostForm(f => ({ ...f, coverageZone: e.target.value }))} className={inp} />
                <input placeholder="Phone (optional)" value={ghostForm.phone} onChange={e => setGhostForm(f => ({ ...f, phone: e.target.value }))} className={inp} />
                <button disabled={creatingGhost} className="sm:col-span-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                  {creatingGhost ? "Creating…" : "Create Ghost Agent"}
                </button>
              </form>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Ghost Agents ({ghostAgents.length})</h2></div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr><th className="text-left px-4 py-2.5">Name</th><th className="text-left px-4 py-2.5">Admin Label</th><th className="text-left px-4 py-2.5">Zone</th><th className="text-left px-4 py-2.5">Status</th><th className="px-4 py-2.5"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ghostAgents.map(a => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                      <td className="px-4 py-3 text-slate-500">{a.ghostAdminLabel}</td>
                      <td className="px-4 py-3 text-slate-500">{a.coverageZone || "—"}</td>
                      <td className="px-4 py-3">
                        {a.ghostConvertedToUserId
                          ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Converted</span>
                          : <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Ghost — Active</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!a.ghostConvertedToUserId && (
                          <button onClick={() => { setConvertFor(a); setConvertEmail(""); setConvertResult(null); }}
                            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-2.5 py-1.5 rounded-lg">
                            Convert to Real Agent
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {ghostAgents.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">No ghost agents yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "signups" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Pending Signups ({signups.length})</h2>
              <button onClick={fetchSignups} className="text-slate-400 hover:text-slate-600"><RefreshCw className="w-4 h-4" /></button>
            </div>
            <p className="px-6 pt-3 text-xs text-slate-400">Every new self-service signup sits here until reviewed — approving or rejecting fires the matching email automatically and controls whether they can log in.</p>
            <div className="divide-y divide-slate-100 mt-3">
              {signups.map(s => (
                <div key={s.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-slate-800">{s.name} <span className="text-xs text-slate-400 font-normal">({s.role})</span></p>
                    <p className="text-xs text-slate-500">{s.email} {s.phone && `· ${s.phone}`} {s.company && `· ${s.company}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => reviewSignup(s.id, "approve")} disabled={signupBusy === s.id}
                      className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-lg">
                      <CheckCircle className="w-3.5 h-3.5" />Approve
                    </button>
                    <button onClick={() => setRejectFor(s)} disabled={signupBusy === s.id}
                      className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-lg">
                      <XCircle className="w-3.5 h-3.5" />Reject
                    </button>
                  </div>
                </div>
              ))}
              {signups.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No pending signups</div>}
            </div>
          </div>
        )}

        {tab === "subadmins" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-1"><UserPlus className="w-5 h-5 text-purple-600" />Create an Admin-Tier Account</h2>
              <p className="text-xs text-slate-400 mb-4">Only the top-level admin can create these. A temporary password is generated and the account must change it on first login.</p>
              {subResult && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                  <p className="font-semibold text-amber-800">Account created — share this temp password securely (shown once):</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <code className="bg-white px-2 py-1 rounded border border-amber-200 text-amber-900">{subResult.tempPassword}</code>
                    <button onClick={() => navigator.clipboard.writeText(subResult.tempPassword)} className="text-amber-700 hover:text-amber-900"><Copy className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
              <form onSubmit={createSubAdmin} className="grid sm:grid-cols-2 gap-3">
                <input required placeholder="Full name" value={subForm.name} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} className={inp} />
                <input required type="email" placeholder="Email" value={subForm.email} onChange={e => setSubForm(f => ({ ...f, email: e.target.value }))} className={inp} />
                <select value={subForm.role} onChange={e => setSubForm(f => ({ ...f, role: e.target.value }))} className={`${inp} sm:col-span-2 bg-white`}>
                  <option value="sub_admin_orders">Sub-Admin — Orders</option>
                  <option value="sub_admin_users">Sub-Admin — User Management</option>
                  <option value="sub_admin_finance">Sub-Admin — Finance</option>
                  <option value="sub_admin_support">Sub-Admin — Support</option>
                  <option value="admin">Full Admin (unrestricted)</option>
                </select>
                <button disabled={creatingSub} className="sm:col-span-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                  {creatingSub ? "Creating…" : "Create Account"}
                </button>
              </form>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900 flex items-center gap-2"><Users className="w-4 h-4" />Admin-Tier Accounts ({subAdmins.length})</h2></div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr><th className="text-left px-4 py-2.5">Name</th><th className="text-left px-4 py-2.5">Email</th><th className="text-left px-4 py-2.5">Role</th><th className="text-left px-4 py-2.5">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subAdmins.map(a => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                      <td className="px-4 py-3 text-slate-500">{a.email}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{SUB_ADMIN_LABELS[a.role] ?? a.role}</span></td>
                      <td className="px-4 py-3">
                        {a.mustChangePassword && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full mr-1.5">Must change password</span>}
                        {a.suspended && <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">Suspended</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Convert ghost modal */}
      {convertFor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConvertFor(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-1">Convert &quot;{convertFor.name}&quot; to a Real Agent</h3>
            <p className="text-xs text-slate-500 mb-4">Creates a self-registered account for this ghost's local contact. The ghost row is frozen but keeps its job history.</p>
            {convertResult ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm">
                <p className="font-semibold text-green-800">Converted! Share the temp password securely:</p>
                <p className="text-green-700 mt-1">{convertResult.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-white px-2 py-1 rounded border border-green-200">{convertResult.tempPassword}</code>
                  <button onClick={() => navigator.clipboard.writeText(convertResult.tempPassword)} className="text-green-700"><Copy className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => setConvertFor(null)} className="mt-3 text-xs text-slate-500 underline">Close</button>
              </div>
            ) : (
              <form onSubmit={submitConvert} className="space-y-3">
                <input required type="email" placeholder="Their real login email" value={convertEmail} onChange={e => setConvertEmail(e.target.value)} className={inp} />
                <div className="flex gap-2">
                  <button disabled={converting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                    {converting ? "Converting…" : "Convert"}
                  </button>
                  <button type="button" onClick={() => setConvertFor(null)} className="px-4 text-slate-500 text-sm">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reject signup modal */}
      {rejectFor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setRejectFor(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-3">Reject Signup — {rejectFor.name}</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Reason (included in the rejection email)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm mb-4" />
            <div className="flex gap-2">
              <button onClick={() => reviewSignup(rejectFor.id, "reject", rejectReason)} disabled={signupBusy === rejectFor.id}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm">
                {signupBusy === rejectFor.id ? "Rejecting…" : "Reject & Send Email"}
              </button>
              <button onClick={() => setRejectFor(null)} className="px-4 text-slate-500 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
