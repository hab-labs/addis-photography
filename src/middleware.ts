import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, isUserRole } from '@/lib/auth/config';

const PUBLIC_PATHS = ['/login', '/a'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  const sessionId = request.cookies.get('addis_session_id')?.value;
  const role = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const mustChangePw = request.cookies.get('addis_must_change_pw')?.value;
  const isAuthenticated = Boolean(sessionId && isUserRole(role));

  // 1. Root path handling
  if (pathname === '/') {
    if (isAuthenticated) {
      if (mustChangePw === 'true') {
        return NextResponse.redirect(new URL('/login?change_password=1', request.url));
      }
      return NextResponse.redirect(new URL('/today', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Prevent already-authenticated users from getting stuck on /login
  if (pathname === '/login') {
    if (isAuthenticated && mustChangePw !== 'true') {
      const nextUrl = request.nextUrl.searchParams.get('next');
      const target = nextUrl && nextUrl.startsWith('/') && !nextUrl.startsWith('//') ? nextUrl : '/today';
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // 3. Public guest album access and public auth APIs
  if (isPublic || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // 4. Unauthenticated access to protected routes -> redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Force first-time password change before granting access to protected pages
  if (mustChangePw === 'true') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('change_password', '1');
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 6. Role-based route protection: Staff cannot access Admin or financial reports
  if (pathname.startsWith('/admin') || pathname.startsWith('/reports')) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/today', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/today/:path*',
    '/requests/:path*',
    '/customers/:path*',
    '/orders/:path*',
    '/albums/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/reports/:path*',
  ],
};
