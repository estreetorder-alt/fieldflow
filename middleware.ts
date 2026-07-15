import { NextRequest, NextResponse } from "next/server";

const PROTECTED: Record<string, string[]> = {
  admin:  ["/admin"],
  agent:  ["/agent"],
  client: ["/client"],
};

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

  // Payment providers redirect to https tunnel (required). Login cookies are on localhost.
  // Bounce wallet/billing return URLs back to local app immediately.
  const local = localAppOrigin();
  if (local && isTunnelHost(host) && pathname.startsWith("/client")) {
    return NextResponse.redirect(`${local}${pathname}${search}`);
  }

  // Allow public paths
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/whop/webhook") ||
    pathname.startsWith("/api/pdcash/webhook")
  ) return NextResponse.next();

  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  if (!userId || !userRole) {
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url));
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
