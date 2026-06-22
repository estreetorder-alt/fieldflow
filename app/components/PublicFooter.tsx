import Link from "next/link";
import { Camera } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <span className="text-slate-200 font-bold text-lg">FieldFlow</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">
              Professional field inspection services for property managers and real estate professionals.
            </p>
          </div>
          <div>
            <h4 className="text-slate-200 font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/services" className="hover:text-slate-200 transition-colors">Services</Link></li>
              <li><Link href="/coverage" className="hover:text-slate-200 transition-colors">Coverage</Link></li>
              <li><Link href="/contact" className="hover:text-slate-200 transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-200 font-semibold text-sm mb-4">Portals</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-slate-200 transition-colors">Client Login</Link></li>
              <li><Link href="/login" className="hover:text-slate-200 transition-colors">Agent Login</Link></li>
              <li><Link href="/register/client" className="hover:text-slate-200 transition-colors">Sign Up as Client</Link></li>
              <li><Link href="/register/agent" className="hover:text-slate-200 transition-colors">Become a Field Agent</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-200 font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-slate-200 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-slate-200 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600">
          <p>&copy; {new Date().getFullYear()} Velocity REOs, Inc. All rights reserved.</p>
          <Link href="/admin" className="opacity-0 hover:opacity-20 transition-opacity" title="Admin">·</Link>
        </div>
      </div>
    </footer>
  );
}
