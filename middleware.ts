import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Enhanced logging to help debug 404 issues on Vercel
  console.log(`[Middleware] Request path: ${request.nextUrl.pathname}`);
  console.log(`[Middleware] Method: ${request.method}`);
  console.log(`[Middleware] Search params: ${request.nextUrl.search}`);
  
  // Special handling for API requests
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Add CORS headers for API routes
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    // Handle OPTIONS requests (preflight) explicitly
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: response.headers,
      });
    }
    
    return response;
  }

  // Continue with normal request handling for non-API routes
  return NextResponse.next();
}

// Apply this middleware to all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)',
  ],
};