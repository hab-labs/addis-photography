import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isUserRole } from "@/lib/auth/config";

const PUBLIC_PATHS = ["/login", "/a"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isPublic || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const role = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!isUserRole(role)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/reports")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/today", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/today/:path*",
    "/requests/:path*",
    "/customers/:path*",
    "/orders/:path*",
    "/albums/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/reports/:path*",
  ],
};
