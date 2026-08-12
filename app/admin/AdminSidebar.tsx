"use client";
import Link from "next/link";
import {
  LayoutGrid, ClipboardList, Camera, Users, UserPlus, DollarSign,
  AlertTriangle, ShieldCheck, CreditCard, Tag, Link2, Mail, History,
  ChevronsLeft, ChevronsRight, Menu, X, LifeBuoy, Wifi, WifiOff,
} from "lucide-react";

export type AdminTab = "orders"|"agents"|"users"|"wallet"|"samples"|"payouts"|"payment-links"|"pricing"|"emails"|"disputes"|"audit"|"photos";

interface NavItem { key: AdminTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number; }
interface NavGroup { label: string; items: NavItem[]; }

function buildGroups(badges: { samples: number; photos: number }): NavGroup[] {
  return [
    {
      label: "Operations",
      items: [
        { key: "orders", label: "Orders", icon: ClipboardList },
        { key: "photos", label: "Photo Inbox", icon: Camera, badge: badges.photos },
        { key: "disputes", label: "Disputes", icon: AlertTriangle },
      ],
    },
    {
      label: "Team",
      items: [
        { key: "agents", label: "Agents", icon: Users },
        { key: "users", label: "Users / Vendors", icon: UserPlus },
        { key: "samples", label: "Samples", icon: ShieldCheck, badge: badges.samples },
      ],
    },
    {
      label: "Finance",
      items: [
        { key: "wallet", label: "Wallet", icon: DollarSign },
        { key: "payouts", label: "Payouts", icon: CreditCard },
        { key: "pricing", label: "Pricing", icon: Tag },
        { key: "payment-links", label: "Payment Links", icon: Link2 },
      ],
    },
    {
      label: "System",
      items: [
        { key: "emails", label: "Email Log", icon: Mail },
        { key: "audit", label: "Audit Log", icon: History },
      ],
    },
  ];
}

function NavRow({ item, active, collapsed, onClick }: { item: NavItem; active: boolean; collapsed: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${collapsed ? "justify-center" : ""} ${
        active ? "bg-[#FF6A00]/10 text-[#C2410C]" : "text-slate-500 hover:bg-slate-50 hover:text-[#081A36]"
      }`}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
      {!collapsed && !!item.badge && item.badge > 0 && (
        <span className="bg-[#FF6A00] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>
      )}
      {collapsed && !!item.badge && item.badge > 0 && (
        <span className="absolute mt-[-18px] ml-[10px] w-2 h-2 rounded-full bg-[#FF6A00]" />
      )}
    </button>
  );
}

function SidebarBody({
  activeTab, onSelectTab, collapsed, badges, onTeamAccess, liveConnected,
}: {
  activeTab: AdminTab; onSelectTab: (t: AdminTab) => void; collapsed: boolean;
  badges: { samples: number; photos: number }; onTeamAccess: () => void; liveConnected: boolean;
}) {
  const groups = buildGroups(badges);
  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div className="space-y-1">
          <NavRow item={{ key: "orders", label: "Dashboard", icon: LayoutGrid }} active={false} collapsed={collapsed} onClick={() => onSelectTab("orders")} />
        </div>
        {groups.map((g) => (
          <div key={g.label}>
            {!collapsed && <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{g.label}</p>}
            <div className="space-y-1">
              {g.items.map((item) => (
                <NavRow key={item.key} item={item} active={activeTab === item.key} collapsed={collapsed} onClick={() => onSelectTab(item.key)} />
              ))}
            </div>
          </div>
        ))}
        <div>
          {!collapsed && <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Access</p>}
          <button onClick={onTeamAccess} title={collapsed ? "Team & Access" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-[#081A36] ${collapsed ? "justify-center" : ""}`}>
            <ShieldCheck className="w-[18px] h-[18px] shrink-0 text-purple-600" />
            {!collapsed && <span className="flex-1 text-left truncate">Team &amp; Access</span>}
          </button>
        </div>
      </nav>

      <div className="px-3 pb-3">
        {!collapsed ? (
          <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-1.5">
              {liveConnected ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-slate-400" />}
              <p className="text-sm font-bold text-[#081A36]">{liveConnected ? "Live" : "Offline"}</p>
            </div>
            <p className="text-xs text-slate-500 leading-snug mb-3">Real-time order &amp; bid updates {liveConnected ? "are streaming in." : "are currently paused."}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400"><LifeBuoy className="w-3.5 h-3.5" />Need help? Visit the help center</div>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            {liveConnected ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-slate-400" />}
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminSidebar({
  activeTab, onSelectTab, collapsed, onToggleCollapsed, mobileOpen, onCloseMobile, badges, onTeamAccess, liveConnected,
}: {
  activeTab: AdminTab;
  onSelectTab: (t: AdminTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  badges: { samples: number; photos: number };
  onTeamAccess: () => void;
  liveConnected: boolean;
}) {
  return (
    <>
      {/* Desktop sidebar — width toggles between full and icon-rail, never a top bar */}
      <aside className={`hidden lg:flex lg:flex-col shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0 transition-all duration-200 ${collapsed ? "w-[76px]" : "w-64"}`}>
        <div className={`px-4 pt-5 pb-4 border-b border-slate-200 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <img src="/snapect-logo.png" alt="Snapect" className="h-7 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full">Admin</span>
            </Link>
          )}
          <button onClick={onToggleCollapsed} aria-label="Toggle sidebar" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 shrink-0">
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>
        <SidebarBody activeTab={activeTab} onSelectTab={onSelectTab} collapsed={collapsed} badges={badges} onTeamAccess={onTeamAccess} liveConnected={liveConnected} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white flex flex-col shadow-2xl">
            <div className="px-4 pt-5 pb-4 border-b border-slate-200 flex items-center justify-between">
              <Link href="/admin" className="flex items-center gap-2" onClick={onCloseMobile}>
                <img src="/snapect-logo.png" alt="Snapect" className="h-7 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full">Admin</span>
              </Link>
              <button onClick={onCloseMobile} aria-label="Close menu" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarBody
              activeTab={activeTab}
              onSelectTab={(t) => { onSelectTab(t); onCloseMobile(); }}
              collapsed={false}
              badges={badges}
              onTeamAccess={() => { onTeamAccess(); onCloseMobile(); }}
              liveConnected={liveConnected}
            />
          </aside>
        </div>
      )}
    </>
  );
}

export { Menu as HamburgerIcon };
