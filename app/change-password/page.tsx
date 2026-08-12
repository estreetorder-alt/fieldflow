"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import AuthShowcase from "../components/AuthShowcase";

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "";
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inp = "w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    const r = await fetch("/api/auth/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword: password }),
    });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) { setError(d.error ?? "Could not change password"); return; }
    window.location.assign(redirect || "/");
  }

  return (
    <div className="min-h-screen flex bg-white">
      <AuthShowcase/>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6 flex justify-center">
            <img src="/snapect-logo.png" alt="Snapect" className="h-10 w-auto object-contain" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
          </div>
          <div className="mb-7">
            <div className="w-11 h-11 rounded-xl bg-[#FF6A00]/10 text-[#FF6A00] flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5"/>
            </div>
            <h1 className="text-2xl font-bold text-[#081A36]">Set a new password</h1>
            <p className="text-sm text-slate-500 mt-1">Your account was created with a temporary password. Choose a new one before continuing.</p>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
              <input type="password" placeholder="Temporary password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required className={inp}/>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
              <input type={showPw?"text":"password"} placeholder="New password (min 8 characters)" value={password} onChange={e=>setPassword(e.target.value)} required className={inp}/>
              <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
              <input type={showPw?"text":"password"} placeholder="Confirm new password" value={confirm} onChange={e=>setConfirm(e.target.value)} required className={inp}/>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#FF6A00] hover:bg-[#FF8C1A] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
              {loading ? "Saving…" : "Set Password & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={null}>
      <ChangePasswordForm />
    </Suspense>
  );
}
