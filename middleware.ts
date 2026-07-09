import { NextRequest, NextResponse } from "next/server";

const PROTECTED: Record<string, string[]> = {
  admin:  ["/admin"],
  agent:  ["/agent"],
  client: ["/client"],
};

const PUBLIC = ["/", "/login", "/register", "/services", "/coverage", "/work", "/contact", "/privacy", "/terms", "/refund-policy", "/faq", "/api/auth", "/api/payment-links", "/api/validate-address", "/api/coverage-check", "/api/zip-directory", "/sitemap.xml", "/robots.txt", "/snapect-logo.png", "/_next", "/favicon"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/whop/webhook")) return NextResponse.next();

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
