"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import AuthShowcase from "../components/AuthShowcase";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [step, setStep] = useState<"request"|"reset"|"done"|"invalid">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).then(r => r.json()).then(d => {
        setStep(d.valid ? "reset" : "invalid");
        setLoading(false);
      });
    }
  }, [token]);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const r = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const d = await r.json();
    setMessage(d.message ?? "Check your email for a reset link.");
    setLoading(false);
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    const r = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error ?? "Reset failed"); setLoading(false); return; }
    setStep("done");
    setLoading(false);
    setTimeout(() => router.push("/login"), 3000);
  }

  const inp = "w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A1A] focus:border-transparent";

  return (
    <div className="min-h-screen flex bg-white">
      <AuthShowcase/>

      <div className="flex-1 flex flex-col">
        <div className="p-4 lg:p-6">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0A1128] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5"/>Back to login
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 pb-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-6 flex justify-center">
              <img src="/snapect-logo.png" alt="Snapect" className="h-10 w-auto object-contain" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
            </div>

            <div className="mb-7">
              <h1 className="text-2xl font-bold text-[#0A1128] font-display">
                {step === "request" ? "Reset Your Password" :
                 step === "reset" ? "Set New Password" :
                 step === "done" ? "Password Updated!" : "Invalid Link"}
              </h1>
              {step === "request" && !message && (
                <p className="text-slate-400 mt-1 text-sm">Enter your email address and we&apos;ll send you a link to reset your password.</p>
              )}
              {step === "reset" && (
                <p className="text-slate-400 mt-1 text-sm">Choose a new password for your account.</p>
              )}
            </div>

            {loading && step === "request" && token ? (
              <div className="text-center py-8 text-slate-400 text-sm">Validating reset link…</div>
            ) : step === "invalid" ? (
              <div className="text-center">
                <p className="text-red-600 font-semibold mb-2">This reset link is invalid or has expired.</p>
                <p className="text-slate-500 text-sm mb-4">Reset links expire after 1 hour. Please request a new one.</p>
                <Link href="/reset-password" className="text-[#FF6A1A] font-semibold hover:underline">Request new reset link</Link>
              </div>
            ) : step === "done" ? (
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3"/>
                <p className="font-bold text-slate-900 mb-2">Password updated successfully!</p>
                <p className="text-slate-500 text-sm">Redirecting to login in 3 seconds…</p>
                <Link href="/login" className="mt-4 inline-block text-[#FF6A1A] font-semibold hover:underline text-sm">Go to login now</Link>
              </div>
            ) : step === "request" ? (
              <>
                {message ? (
                  <div className="text-center">
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3"/>
                    <p className="font-semibold text-slate-900 mb-1">{message}</p>
                    <p className="text-slate-500 text-sm">Check your inbox (and spam folder).</p>
                    <Link href="/login" className="mt-4 inline-block text-[#FF6A1A] font-semibold hover:underline text-sm">Back to login</Link>
                  </div>
                ) : (
                  <form onSubmit={requestReset} className="space-y-4">
                    {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                          placeholder="Enter your email address" className={inp}/>
                      </div>
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6A1A] to-[#FF3D00] hover:opacity-90 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-opacity text-sm">
                      {loading ? "Sending…" : "Send Reset Link"}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <form onSubmit={doReset} className="space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{error}</div>}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                    <input type={showPw ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min 8 characters" className={inp}/>
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                    <input type={showPw ? "text" : "password"} required value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat password" className={inp}/>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6A1A] to-[#FF3D00] hover:opacity-90 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-opacity text-sm">
                  {loading ? "Updating…" : "Update Password"}
                </button>
              </form>
            )}

            {(step === "request" || step === "reset") && (
              <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0"/>
                <span>Don&apos;t worry, we&apos;ll never share your email with anyone else.</span>
              </div>
            )}
          </div>
        </div>

        <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-100">
          <Link href="/privacy" className="hover:text-slate-600">Privacy Policy</Link>
          {" · "}
          <Link href="/terms" className="hover:text-slate-600">Terms of Service</Link>
          {" · "}
          &copy; {new Date().getFullYear()} Snapect
        </footer>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>;
}
