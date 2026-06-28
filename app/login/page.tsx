"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Eye, EyeOff, ArrowLeft, Lock, Mail } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const TEST = [
    { role:"Admin", email:"admin@test.com", password:"admin123", color:"bg-purple-100 text-purple-700 border-purple-200" },
    { role:"Agent", email:"agent@test.com", password:"agent123", color:"bg-[#c8991a]/10 text-[#c8991a] border-[#c8991a]/30" },
    { role:"Client", email:"client@test.com", password:"client123", color:"bg-blue-100 text-blue-700 border-blue-200" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error||"Login failed"); return; }
      const dashboards: Record<string,string> = { admin:"/admin", agent:"/agent", client:"/client" };
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
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 bg-[#c8991a] rounded-xl flex items-center justify-center"><Camera className="w-5 h-5 text-white"/></div>
              <span className="font-bold text-2xl text-white">FieldFlow</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Sign in to your account</h1>
            <p className="text-slate-400 mt-1 text-sm">Enter your credentials to access your dashboard</p>
          </div>

          {/* Test accounts */}
          <div className="mb-5 bg-[#1a3260] border border-[#1a3260] rounded-xl p-4">
            <p className="text-xs font-bold text-[#f0b429] uppercase tracking-wider mb-3">Test Accounts (click to fill)</p>
            <div className="grid grid-cols-3 gap-2">
              {TEST.map(acc=>(
                <button key={acc.role} onClick={()=>{ setEmail(acc.email); setPassword(acc.password); }}
                  className={`text-xs font-semibold px-2 py-2 rounded-lg border transition-opacity hover:opacity-80 ${acc.color}`}>
                  {acc.role}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-xl">
            {error&&<div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"
                    className="w-full pl-9 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] focus:border-transparent transition-all"/></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                  <input type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••"
                    className="w-full pl-9 pr-10 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8991a] focus:border-transparent transition-all"/>
                  <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                  </button></div>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full mt-6 bg-[#c8991a] hover:bg-[#f0b429] disabled:opacity-60 text-[#0f1f3d] font-bold py-3 rounded-xl transition-colors text-sm">
              {loading?"Signing in…":"Sign in"}
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
      <footer className="py-5 text-center text-xs text-slate-600 border-t border-[#1a3260]">
        <Link href="/privacy" className="hover:text-slate-400">Privacy Policy</Link>
        {" · "}
        <Link href="/terms" className="hover:text-slate-400">Terms of Service</Link>
        {" · "}
        &copy; {new Date().getFullYear()} FieldFlow
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
