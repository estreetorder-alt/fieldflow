import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />
      <section className="bg-[#0f1f3d] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <FileText className="w-12 h-12 text-[#c8991a] mx-auto mb-4"/>
          <h1 className="text-4xl font-extrabold mb-3">Terms of Service</h1>
          <p className="text-slate-300">Last updated: January 1, 2025 · Snapect is a Florida corporation.</p>
        </div>
      </section>
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          {[
            { title:"1. Acceptance of Terms", body:"By creating an account or placing an order on Snapect, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform." },
            { title:"2. Client Terms", body:"Clients submit orders for field inspection and photography services. All orders are binding upon submission. Orders cannot be modified after submission — please verify the address and service selection before paying. Cancellations are permitted before an agent accepts an order. Once an agent accepts, cancellations may incur a fee of up to 50% of the order total." },
            { title:"3. No Substitutions or Changes to Orders", body:"Field agents carry out orders exactly as submitted. Clients may not request changes, additional shots, or substitutions after an order is placed. If additional services are needed, a new order must be submitted." },
            { title:"4. Photo Review & Delivery", body:"All photos submitted by field agents are reviewed by Snapect administrators before being marked complete and released to the client. Photos are stored for 30 days after completion, then permanently deleted. Snapect is not liable for photos deleted after the 30-day window." },
            { title:"5. Payment Terms", body:"All orders must be paid in full at the time of submission via Whop or Snapect wallet balance. Prices displayed are final. Rush fees are non-refundable. Snapect does not issue cash refunds — see our Refund Policy for how quality issues are resolved via reshoot or wallet credit. If you believe an order was not completed correctly, open a dispute from your order page within 5 business days." },
            { title:"6. Agent Terms", body:"Field agents are independent contractors, not employees of Snapect. Agents must (a) submit a 7-photo sample set within 48 hours of registration, (b) respond to order offers within 3 hours during 9 AM–6 PM local time, (c) complete orders within 30 hours unless otherwise specified, and (d) maintain professional quality standards. Snapect reserves the right to terminate agent access for poor performance, missed deadlines, or quality issues." },
            { title:"7. Agent Signup", body:"Creating an agent account on Snapect is completely free — there is no application or signup fee. Account creation does not guarantee continued access; Snapect may suspend or terminate agent accounts for poor performance, missed deadlines, or quality issues as described in Section 6." },
            { title:"8. Agent Grade & Rotation", body:"When multiple agents serve the same ZIP code, a rotating system is used, with higher-graded agents receiving priority access to orders. Grades are calculated based on completion rate, on-time performance, and photo quality scores." },
            { title:"9. Payments to Agents", body:"Agent compensation is paid every Friday via PayPal for all orders approved that week. Snapect covers PayPal transaction fees. A minimum balance of $40 is required for payout. Unpaid balances under $40 roll to the following week." },
            { title:"10. Prohibited Use", body:"Users may not use Snapect to order inspections of properties they do not have authorization to photograph, to harass or surveil individuals, or to violate any applicable local, state, or federal laws. Snapect reserves the right to cancel any order it deems suspicious and to cooperate with law enforcement requests." },
            { title:"11. Limitation of Liability", body:"Snapect is not liable for: inaccurate addresses provided by clients, inability to access a property, weather or environmental conditions preventing completion, or any indirect, incidental, or consequential damages. Maximum liability is limited to the amount paid for the specific order in question." },
            { title:"12. Governing Law", body:"These Terms are governed by the laws of the State of Florida. Any disputes shall be resolved in the courts of Sarasota County, Florida." },
            { title:"13. Changes to Terms", body:"Snapect reserves the right to update these Terms at any time. Continued use of the platform after changes constitutes acceptance of the new Terms." },
          ].map(s=>(
            <div key={s.title} className="mb-8">
              <h2 className="text-xl font-bold text-[#0f1f3d] mb-3 border-b border-[#c8991a]/30 pb-2">{s.title}</h2>
              <p className="text-slate-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
