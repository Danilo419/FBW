// middleware.ts
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";

const ADMIN_PREFIX = "/admin";
const PUBLIC_UNDER_ADMIN = ["/admin/login", "/admin/logout"];

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Ignorar ficheiros internos / assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_vercel") ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Proteção das rotas /admin
  if (pathname.startsWith(ADMIN_PREFIX)) {
    const isPublicAdminRoute = PUBLIC_UNDER_ADMIN.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

    if (!isPublicAdminRoute) {
      const hasSession =
        Boolean(req.cookies.get("__Secure-next-auth.session-token")?.value) ||
        Boolean(req.cookies.get("next-auth.session-token")?.value);

      if (!hasSession) {
        const url = req.nextUrl.clone();
        url.pathname = "/admin/login";
        url.search = "";
        url.searchParams.set("next", pathname + search);
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};