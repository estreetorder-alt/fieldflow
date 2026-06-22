import Link from "next/link";

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
          <p className="text-slate-500">Last updated: June 21, 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
            <p>When you use FieldFlow (operated by Velocity REOs, Inc.), we collect information you provide directly, including:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Account information (name, email address, phone number, company name)</li>
              <li>Order information (property addresses, service type, special instructions)</li>
              <li>Payment information (processed securely — we do not store raw card data)</li>
              <li>Field agent profiles (bio, coverage zone, vehicle information)</li>
              <li>Photos and media uploaded during field inspections</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Process and fulfill field inspection orders</li>
              <li>Match clients with the nearest highest-rated available field agents</li>
              <li>Send order status updates and completion notifications by email</li>
              <li>Calculate and process agent compensation</li>
              <li>Improve our dispatch algorithms and service quality</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Information Sharing</h2>
            <p className="font-medium text-slate-900">We do not sell your personal information.</p>
            <p className="mt-2">We do not share client details — including your name, contact information, or property addresses — with field agents or third parties except as necessary to fulfill your inspection order. Field agents are only provided with the property address and service instructions required to complete the job.</p>
            <p className="mt-2">We may share aggregated, non-identifiable statistics for business reporting purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Order photos are retained for <strong>30 days</strong> after order completion and then permanently deleted</li>
              <li>Account information is retained for the life of your account plus 7 years for compliance purposes</li>
              <li>Invoice records are retained for 7 years as required by tax law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Data Security</h2>
            <p>All data is stored on our secure, encrypted servers. We use HTTPS for all data transmission. Access to personal data is strictly limited to authorized personnel on a need-to-know basis. We conduct regular security audits and maintain SOC 2 Type II compliance.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of non-essential communications</li>
            </ul>
            <p className="mt-3">To exercise these rights, email <a href="mailto:privacy@fieldflow.com" className="text-blue-600 hover:underline">privacy@fieldflow.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Cookies</h2>
            <p>We use essential session cookies to keep you logged in. We do not use advertising tracking cookies or share cookie data with third parties. You can disable cookies in your browser settings, but this will prevent you from logging in.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Contact Us</h2>
            <p>For privacy-related questions or requests:</p>
            <div className="mt-3 p-4 bg-slate-50 rounded-xl text-sm">
              <p className="font-medium">Velocity REOs, Inc. — Privacy Office</p>
              <p>Email: privacy@fieldflow.com</p>
              <p>Phone: (941) 723-3200</p>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        <p>© {new Date().getFullYear()} Velocity REOs, Inc. · <Link href="/terms" className="hover:text-slate-600">Terms of Service</Link></p>
      </footer>
    </div>
  );
}
