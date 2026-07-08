import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import { ShieldCheck, Camera, Wallet, XCircle } from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />
      <section className="bg-[#0f1f3d] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <ShieldCheck className="w-12 h-12 text-[#c8991a] mx-auto mb-4"/>
          <h1 className="text-4xl font-extrabold mb-3">Refund Policy</h1>
          <p className="text-slate-300">Last updated: July 2026</p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10 flex items-start gap-4">
            <XCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="font-bold text-amber-900 mb-1">Snapect does not issue cash refunds.</p>
              <p className="text-amber-800 text-sm leading-relaxed">
                Because every order dispatches a field agent to a physical property, compensates that agent for
                their time and travel, and covers payment processing costs the moment it&apos;s placed, we aren&apos;t
                able to reverse a completed transaction. If something goes wrong, we make it right through a
                <strong> free reshoot</strong> or a <strong>wallet credit</strong> toward a future order — never a cash refund.
              </p>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-xl font-bold text-[#0f1f3d] mb-3 border-b border-[#c8991a]/30 pb-2">Before an agent accepts your order</h2>
            <p className="text-slate-600 leading-relaxed">
              You may cancel free of charge any time before a field agent accepts your order — nothing has been
              dispatched yet, so nothing needs to be reshot or credited. Once an agent accepts, the order is
              considered active and the no-refund policy below applies.
            </p>
          </div>

          <div className="mb-10">
            <h2 className="text-xl font-bold text-[#0f1f3d] mb-3 border-b border-[#c8991a]/30 pb-2">If something goes wrong</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              If your delivered photos are incomplete, low quality, of the wrong property, or otherwise don&apos;t
              meet the order&apos;s shot list, open a dispute from your order page within <strong>5 business days</strong> of
              delivery. Every dispute is reviewed by our team and resolved one of these ways:
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl">
                <Camera className="w-6 h-6 text-[#c8991a] mb-2"/>
                <p className="font-bold text-[#0f1f3d] text-sm mb-1">Free Reshoot</p>
                <p className="text-xs text-slate-500">We dispatch another agent to redo the shots at no extra cost — the most common outcome for quality issues.</p>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl">
                <Wallet className="w-6 h-6 text-[#c8991a] mb-2"/>
                <p className="font-bold text-[#0f1f3d] text-sm mb-1">Wallet Credit</p>
                <p className="text-xs text-slate-500">If a reshoot isn&apos;t practical, we credit your Snapect wallet for use toward a future order.</p>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-[#c8991a] mb-2"/>
                <p className="font-bold text-[#0f1f3d] text-sm mb-1">Explanation</p>
                <p className="text-xs text-slate-500">If the order was completed correctly per the shot list, we&apos;ll explain why and close the dispute.</p>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-xl font-bold text-[#0f1f3d] mb-3 border-b border-[#c8991a]/30 pb-2">Rush fees & add-ons</h2>
            <p className="text-slate-600 leading-relaxed">
              Rush/turnaround fees are non-refundable once an agent has accepted the order, even if a dispute is
              later resolved via reshoot or credit — the fee compensates for the agent&apos;s expedited scheduling,
              which already happened.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#0f1f3d] mb-3 border-b border-[#c8991a]/30 pb-2">How to open a dispute</h2>
            <p className="text-slate-600 leading-relaxed">
              Log in, open the order in question from your dashboard, and select &quot;File a Dispute.&quot; Include a
              short description and, if helpful, photos showing the issue. Our team typically responds within
              1–2 business days.
            </p>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
