// middleware.ts (raiz do projeto)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/checkout') {
    const ship = req.cookies.get('ship')?.value;
    if (!ship) {
      const url = req.nextUrl.clone();
      url.pathname = '/checkout/address';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/checkout'] };
