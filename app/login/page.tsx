"use client";
import { useState, Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowLeft, Lock, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import AuthShowcase from "../components/AuthShowcase";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

declare global {
  interface Window {
    grecaptcha?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; "expired-callback": () => void }) => number;
      reset: (id?: number) => void;
    };
    onRecaptchaLoad?: () => void;
  }
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
  const [pendingActivation, setPendingActivation] = useState(false);
  const [paymentLinks, setPaymentLinks] = useState<{id:string;label:string;url:string;amount?:number;description:string}[]>([]);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);

  // Load the standard Google reCAPTCHA v2 checkbox (only if a site key is configured)
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    const renderWidget = () => {
      if (recaptchaRef.current && window.grecaptcha && widgetId.current === null) {
        widgetId.current = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (token: string) => { setRecaptchaToken(token); setCaptchaError(false); },
          "expired-callback": () => setRecaptchaToken(""),
        });
      }
    };
    if (window.grecaptcha?.render) { renderWidget(); return; }
    window.onRecaptchaLoad = renderWidget;
    if (!document.querySelector("script[src*='recaptcha/api.js']")) {
      const s = document.createElement("script");
      s.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
      s.async = true; s.defer = true;
      document.head.appendChild(s);
    }
  }, []);

  function refreshCaptcha() {
    if (RECAPTCHA_SITE_KEY && window.grecaptcha && widgetId.current !== null) {
      window.grecaptcha.reset(widgetId.current);
      setRecaptchaToken("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      setCaptchaError(true);
      return;
    }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, recaptchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "pending_activation") {
          // Fetch payment links and show payment UI
          const pl = await fetch("/api/payment-links");
          const pld = await pl.json();
          setPaymentLinks(pld.links?.filter((l: {active:boolean}) => l.active) ?? []);
          setPendingActivation(true);
        } else {
          setError(data.error || "Invalid email or password");
        }
        refreshCaptcha(); return;
      }
      const dashboards: Record<string, string> = { admin: "/admin", agent: "/agent", client: "/client" };
      const dest = redirect || dashboards[data.user.role] || "/";
      window.location.assign(dest);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex bg-white">
      <AuthShowcase/>

      {/* ── Right column: form ── */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 lg:p-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#081A36] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5"/>Back to home
          </Link>
          <p className="hidden sm:block text-sm text-slate-400">
            New to Snapect?{" "}
            <Link href="/register/client" className="text-[#FF6A00] font-semibold hover:underline">Create an account</Link>
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 pb-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-6 flex justify-center">
              <img src="/snapect-logo.png" alt="Snapect" className="h-10 w-auto object-contain" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
            </div>

            <div className="mb-7">
              <h1 className="text-2xl font-bold text-[#081A36] font-display">Welcome Back</h1>
              <p className="text-slate-400 mt-1 text-sm">Sign in to continue to your Snapect dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}
              {captchaError && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl">
                  Please check the &quot;I&apos;m not a robot&quot; box to continue
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                    placeholder="Enter your email" autoComplete="email"
                    className="w-full pl-9 pr-3 border border-slate-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent"/>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <Link href="/reset-password" className="text-xs text-[#FF6A00] hover:underline font-semibold">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} required
                    placeholder="Enter your password" autoComplete="current-password"
                    className="w-full pl-9 pr-10 border border-slate-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:border-transparent"/>
                  <button type="button" onClick={()=>setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>

              {/* Google reCAPTCHA v2 checkbox — hidden entirely if no site key is configured */}
              {RECAPTCHA_SITE_KEY && (
                <div className="flex justify-center">
                  <div ref={recaptchaRef}/>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6A00] to-[#FF8C1A] hover:opacity-90 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-opacity text-sm">
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            {pendingActivation && (
              <div className="mt-4 bg-amber-50 border border-amber-300 rounded-xl p-5">
                <p className="font-bold text-amber-900 text-sm mb-2">⏳ Account Pending Activation</p>
                <p className="text-amber-800 text-xs mb-4 leading-relaxed">Your account has been created but is not yet active. Complete your payment to access your dashboard.</p>
                {paymentLinks.length > 0 ? (
                  <div className="space-y-2">
                    {paymentLinks.map((link: {id:string;label:string;url:string;amount?:number;description:string}) => (
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 p-3 border-2 border-[#FF6A00] rounded-xl hover:bg-[#FF6A00]/5 transition-colors text-sm">
                        <span className="font-bold text-[#081A36]">{link.label}</span>
                        <span className="text-xs bg-[#FF6A00] text-white font-bold px-2.5 py-1 rounded-lg">Pay Now →</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700">Contact <a href="mailto:info@snapect.com" className="underline font-bold">info@snapect.com</a> to complete activation.</p>
                )}
                <button onClick={() => setPendingActivation(false)} className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline">Back to login</button>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0"/>
              <span>Your data is protected with 256-bit encryption. We never share your information with third parties.</span>
            </div>

            <div className="mt-5 text-center space-y-2 lg:hidden">
              <p className="text-sm text-slate-400">
                New here?{" "}
                <Link href="/register/client" className="text-[#FF6A00] font-semibold hover:underline">Sign up as a client</Link>
                {" · "}
                <Link href="/register/agent" className="text-[#FF6A00] font-semibold hover:underline">Become a field agent</Link>
              </p>
            </div>
            <div className="hidden lg:block mt-5 text-center">
              <p className="text-sm text-slate-400">
                <Link href="/register/agent" className="text-[#FF6A00] font-semibold hover:underline">Become a field agent</Link> instead?
              </p>
            </div>
          </div>
        </div>

        <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-100">
          <span className="inline-flex items-center gap-3">
            <span className="hidden sm:inline">256-bit Encryption</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">SOC 2 Ready</span>
            <span className="hidden sm:inline">·</span>
          </span>{" "}
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

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
