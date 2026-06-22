import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 py-4 px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-blue-600 font-semibold text-lg">
          <span className="text-2xl">📷</span> FieldFlow
        </Link>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">← Back to home</Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="text-sm text-blue-600 font-medium uppercase tracking-wider mb-2">Legal</p>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Terms of Service</h1>
          <p className="text-slate-500">Last updated: June 21, 2026</p>
        </div>

        <div className="space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using FieldFlow (operated by Velocity REOs, Inc., &quot;we,&quot; &quot;us,&quot; or &quot;the Company&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Services</h2>
            <p>FieldFlow provides a technology platform that connects property inspection clients with independent field agents. Velocity REOs, Inc. does not perform inspections directly. Field agents are independent contractors, not employees.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Client Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate property addresses and access information</li>
              <li>Ensure the property is accessible on the scheduled date</li>
              <li>Use inspection photos solely for lawful purposes</li>
              <li>Pay all fees at the time of order submission</li>
              <li>Not share, resell, or redistribute inspection photos without written consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Field Agent Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintain accurate coverage zone and vehicle information</li>
              <li>Respond to job offers within 3 hours during 9 AM – 6 PM local time</li>
              <li>Upload photos at minimum 1280×960 resolution</li>
              <li>Not disclose client information to any third party</li>
              <li>Carry valid vehicle insurance and a functional GPS device</li>
              <li>Complete accepted orders within the specified turnaround window</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Fees & Payments</h2>
            <p>All order fees are displayed before submission. Field agent application requires a one-time non-refundable fee of $15.00. Refunds for completed orders are not provided except in cases of documented agent error. Agent compensation is paid within 7–14 business days of order completion.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Turnaround & Service Levels</h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 mt-3">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Service Level</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Turnaround</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Conditions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-medium">Standard</td>
                    <td className="px-4 py-3">Next business day</td>
                    <td className="px-4 py-3 text-slate-500">Orders before 10 AM local time</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Rush 24-Hour</td>
                    <td className="px-4 py-3">Within 24 hours</td>
                    <td className="px-4 py-3 text-slate-500">Additional fee applies</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Rush 6-Hour</td>
                    <td className="px-4 py-3">Within 6 daylight hours</td>
                    <td className="px-4 py-3 text-slate-500">Subject to agent availability</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Photo Availability</h2>
            <p>Inspection photos are stored for <strong>30 days</strong> after order completion. After this period, photos are permanently deleted. Clients are responsible for downloading and backing up their photos within this window. FieldFlow is not liable for photos deleted after the retention period.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Limitation of Liability</h2>
            <p>FieldFlow's liability is limited to the amount paid for the specific order giving rise to the claim. We are not liable for consequential, indirect, or punitive damages arising from use of the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">9. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms, including accounts with repeated order cancellations, fraudulent submissions, or misuse of the field agent network.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">10. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of Florida. Disputes shall be resolved by binding arbitration in Manatee County, Florida.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">11. Contact</h2>
            <div className="p-4 bg-slate-50 rounded-xl text-sm">
              <p className="font-medium">Velocity REOs, Inc.</p>
              <p>Email: legal@fieldflow.com</p>
              <p>Phone: (941) 723-3200</p>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        <p>© {new Date().getFullYear()} Velocity REOs, Inc. · <Link href="/privacy" className="hover:text-slate-600">Privacy Policy</Link></p>
      </footer>
    </div>
  );
}
