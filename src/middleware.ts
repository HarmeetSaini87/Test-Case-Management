import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('panamax_session');
  
  // Exclude auth routes and static assets from redirect
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isApiAuthRoute = request.nextUrl.pathname.startsWith('/api/auth');

  if (!session && !isLoginPage && !isApiAuthRoute) {
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If already logged in and trying to access /login, bounce to dashboard
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|.*\\.png$|.*\\.svg$|favicon.ico).*)',
  ],
};
