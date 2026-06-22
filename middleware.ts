import { NextRequest, NextResponse } from "next/server";

const ROUTE_ROLES: Record<string, string[]> = {
  "/admin": ["admin"],
  "/client": ["client", "admin"],
  "/agent": ["agent", "admin"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  for (const [route, allowedRoles] of Object.entries(ROUTE_ROLES)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      const userId = request.cookies.get("user_id")?.value;
      const userRole = request.cookies.get("user_role")?.value;

      if (!userId || !userRole) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (!allowedRoles.includes(userRole)) {
        const dashboardMap: Record<string, string> = {
          admin: "/admin",
          agent: "/agent",
          client: "/client",
        };
        return NextResponse.redirect(
          new URL(dashboardMap[userRole] || "/", request.url)
        );
      }

      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/client/:path*", "/agent/:path*"],
};
