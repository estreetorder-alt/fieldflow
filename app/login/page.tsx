"use client";
import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowLeft, Lock, Mail, RefreshCw } from "lucide-react";
import Link from "next/link";

function generateCaptcha() {
  const ops = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * 9) + 1;
  let b = Math.floor(Math.random() * 9) + 1;
  if (op === "-" && b > a) [a, b] = [b, a];
  const answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
  return { question: `${a} ${op} ${b} = ?`, answer: String(answer) };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);

  function refreshCaptcha() {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
    setCaptchaError(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (captchaInput.trim() !== captcha.answer) {
      setCaptchaError(true);
      refreshCaptcha();
      return;
    }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid email or password"); refreshCaptcha(); return; }
      const dashboards: Record<string, string> = { admin: "/admin", agent: "/agent", client: "/client" };
      router.push(redirect || dashboards[data.user.role] || "/");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#0f1f3d] flex flex-col">
      <div className="p-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5"/>Back to home
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mb-5 flex justify-center">
              <img src="/snapect-logo.png" alt="Snapect" className="h-14 w-auto object-contain brightness-0 invert"/>
            </div>
            <h1 className="text-2xl font-bold text-white">Sign in to your account</h1>
            <p className="text-slate-400 mt-1 text-sm">Enter your credentials to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-xl space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
            )}
            {captchaError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl">
                Incorrect answer — please try again
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                  placeholder="you@example.com" autoComplete="email"
                  className="w-full pl-9 pr-3 border border-slate-300 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] focus:border-transparent"/>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                <input type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} required
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full pl-9 pr-10 border border-slate-300 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] focus:border-transparent"/>
                <button type="button" onClick={()=>setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>

            {/* Math CAPTCHA */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Security Check</label>
                <button type="button" onClick={refreshCaptcha}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3"/>New question
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-[#0f1f3d] text-[#f0b429] font-bold text-lg px-4 py-2 rounded-lg font-mono tracking-widest select-none">
                  {captcha.question}
                </div>
                <input
                  type="text" inputMode="numeric" value={captchaInput}
                  onChange={e=>{ setCaptchaInput(e.target.value); setCaptchaError(false); }}
                  placeholder="Answer" maxLength={3}
                  className={`w-24 border rounded-xl px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#c8991a] ${captchaError ? "border-red-400 bg-red-50" : "border-slate-300"}`}/>
              </div>
              <p className="text-xs text-slate-400 mt-2">Solve the math problem to verify you&apos;re human</p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-60 text-[#0f1f3d] font-bold py-3 rounded-xl transition-colors text-sm">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-5 text-center space-y-2">
            <p className="text-sm text-slate-400">
              New here?{" "}
              <Link href="/register/client" className="text-[#f0b429] font-semibold hover:underline">Sign up as a client</Link>
              {" · "}
              <Link href="/register/agent" className="text-[#f0b429] font-semibold hover:underline">Become a field agent</Link>
            </p>
          </div>
        </div>
      </div>
      <footer className="py-5 text-center text-xs text-slate-600 border-t border-[#1a1a2e]">
        <Link href="/privacy" className="hover:text-slate-400">Privacy Policy</Link>
        {" · "}
        <Link href="/terms" className="hover:text-slate-400">Terms of Service</Link>
        {" · "}
        &copy; {new Date().getFullYear()} Snapect
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
