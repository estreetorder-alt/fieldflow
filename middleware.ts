import { NextRequest, NextResponse } from "next/server";

const PROTECTED: Record<string, string[]> = {
  admin:  ["/admin"],
  agent:  ["/agent"],
  client: ["/client"],
};

// Req. 6 — four scoped sub-admin roles alongside the full-access top-level
// admin. All four share the same /admin route shell at the middleware
// level (route-level gating can't see which client-side tab is active);
// the admin page itself hides/disables tabs the signed-in role doesn't
// cover, and every API route independently re-checks the specific
// permission (e.g. bids route only accepts "admin" or "sub_admin_orders").
const SUB_ADMIN_ROLES = ["sub_admin_orders", "sub_admin_users", "sub_admin_finance", "sub_admin_support"];

const PUBLIC = ["/", "/login", "/register", "/services", "/coverage", "/work", "/contact", "/privacy", "/terms", "/refund-policy", "/faq", "/api/auth", "/api/payment-links", "/api/validate-address", "/api/coverage-check", "/api/zip-directory", "/sitemap.xml", "/robots.txt", "/snapect-logo.png", "/_next", "/favicon"];

function isTunnelHost(host: string): boolean {
  return host.includes("ngrok") || host.includes("loca.lt") || host.includes("trycloudflare");
}

function localAppOrigin(): string | null {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  if (base.includes("localhost") || base.includes("127.0.0.1")) return base;
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  // Whop redirects to https ngrok (required). Login cookies are on localhost.
  // Bounce wallet/billing return URLs back to local app immediately.
  const local = localAppOrigin();
  if (local && isTunnelHost(host) && pathname.startsWith("/client")) {
    return NextResponse.redirect(`${local}${pathname}${search}`);
  }

  // Allow public paths
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/whop/webhook")) return NextResponse.next();

  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  if (!userId || !userRole) {
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url));
  }

  // Sub-admins get the same /admin access as full admin at the route level;
  // fine-grained scoping happens in the admin UI and in each API route.
  if (pathname.startsWith("/admin") && SUB_ADMIN_ROLES.includes(userRole)) {
    return NextResponse.next();
  }

  // Check role-based access
  for (const [role, paths] of Object.entries(PROTECTED)) {
    for (const path of paths) {
      if (pathname.startsWith(path) && userRole !== role && userRole !== "admin") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|snapect-logo.png|robots.txt).*)"],
};
