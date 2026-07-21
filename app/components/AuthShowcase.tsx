"use client";
import { ShieldCheck, Clock, BadgeCheck, Star } from "lucide-react";

/**
 * Left-hand brand panel shared by the login and reset-password screens.
 * Dark navy backdrop, orange accent, coverage/trust stats — mirrors the
 * Snapect marketing site so the auth flow doesn't feel like a separate app.
 */
export default function AuthShowcase() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between w-1/2 min-h-screen bg-[#081A36] text-white px-12 py-12 overflow-hidden">
      {/* Ambient glow accents */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-[#FF6A00]/20 rounded-full blur-3xl"/>
      <div className="pointer-events-none absolute bottom-0 left-0 w-72 h-72 bg-[#FF6A00]/10 rounded-full blur-3xl"/>

      {/* Logo */}
      <div className="relative flex items-center gap-2.5">
        <img src="/snapect-logo.png" alt="Snapect" className="h-9 w-auto object-contain" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
      </div>

      {/* Headline */}
      <div className="relative">
        <h1 className="font-display text-4xl xl:text-5xl font-bold leading-[1.1]">
          America&apos;s Trusted<br/>Field Inspection <span className="text-[#FF7A33]">Platform</span>
        </h1>
        <p className="mt-5 text-white/60 text-base max-w-md leading-relaxed">
          Powering thousands of inspections across 35 states with verified agents and industry-leading technology.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
          <Feature icon={<ShieldCheck className="w-4 h-4"/>} title="35 States Coverage" subtitle="Nationwide inspection network"/>
          <Feature icon={<Clock className="w-4 h-4"/>} title="24 Hour Delivery" subtitle="Fast turnaround, every time"/>
          <Feature icon={<BadgeCheck className="w-4 h-4"/>} title="Verified Inspectors" subtitle="Background checked & insured"/>
          <Feature icon={<Star className="w-4 h-4"/>} title="Quality Guaranteed" subtitle="100% satisfaction promise"/>
        </div>
      </div>

      {/* Footer stats */}
      <div className="relative flex items-center gap-8">
        <Stat value="250K+" label="Inspections Completed"/>
        <Stat value="8K+" label="Verified Inspectors"/>
        <Stat value="12K+" label="Happy Clients"/>
      </div>
    </div>
  );
}

function Feature({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
      <div className="w-7 h-7 rounded-lg bg-[#FF6A00]/20 text-[#FF7A33] flex items-center justify-center flex-shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-white leading-tight">{title}</p>
        <p className="text-[11px] text-white/50 leading-tight mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-bold text-white">{value}</p>
      <p className="text-[11px] text-white/50">{label}</p>
    </div>
  );
}
