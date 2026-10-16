import { type NextRequest, NextResponse } from 'next/server';
import { markdownRewrite } from './lib/accept-negotiation';
import { markdownHandlerForPage } from './lib/markdown-routes';

export function proxy(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith('/.well-known/')) {
    return NextResponse.next();
  }

  const handler = markdownHandlerForPage(request.nextUrl.pathname);
  const negotiated = markdownRewrite(request, handler);
  if (negotiated) return negotiated;

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
