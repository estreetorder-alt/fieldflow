"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const testAccounts = [
    { role: "Admin", email: "admin@test.com", password: "admin123", color: "bg-purple-100 text-purple-700 border-purple-200" },
    { role: "Agent", email: "agent@test.com", password: "agent123", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    { role: "Client", email: "client@test.com", password: "client123", color: "bg-blue-100 text-blue-700 border-blue-200" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/_api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      const { user } = data;
      const dashboards: Record<string, string> = {
        admin: "/admin",
        agent: "/agent",
        client: "/client",
      };

      router.push(redirect || dashboards[user.role] || "/");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(acc: { email: string; password: string }) {
    setEmail(acc.email);
    setPassword(acc.password);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-2xl text-slate-900">FieldFlow</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Sign in to your account</h1>
            <p className="text-slate-500 mt-1 text-sm">
              Enter your credentials to access your dashboard
            </p>
          </div>

          {/* Test Accounts */}
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
              Test Accounts (click to fill)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {testAccounts.map((acc) => (
                <button
                  key={acc.role}
                  onClick={() => quickLogin(acc)}
                  className={`text-xs font-medium px-2 py-1.5 rounded-lg border transition-opacity hover:opacity-80 ${acc.color}`}
                >
                  {acc.role}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-xs text-slate-400">
              This is a local test variant — no real credentials required.
            </p>
            <p className="text-sm text-slate-500">
              New here?{" "}
              <Link href="/register/client" className="text-blue-600 font-medium hover:underline">Sign up as a client</Link>
              {" · "}
              <Link href="/register/agent" className="text-blue-600 font-medium hover:underline">Become a field agent</Link>
            </p>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-100">
        <Link href="/privacy" className="hover:text-slate-600">Privacy Policy</Link>
        {" · "}
        <Link href="/terms" className="hover:text-slate-600">Terms of Service</Link>
        {" · "}
        © {new Date().getFullYear()} Velocity REOs, Inc.
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
