// middleware.ts
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";

const PUBLIC_UNDER_ADMIN = ["/admin/login", "/admin/logout"];

const intlMiddleware = createMiddleware(routing);

function getLocaleFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && routing.locales.includes(firstSegment as (typeof routing.locales)[number])) {
    return firstSegment;
  }

  return routing.defaultLocale;
}

function stripLocaleFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && routing.locales.includes(firstSegment as (typeof routing.locales)[number])) {
    const stripped = "/" + segments.slice(1).join("/");
    return stripped === "/" ? "/" : stripped;
  }

  return pathname;
}

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

  const locale = getLocaleFromPathname(pathname);
  const pathnameWithoutLocale = stripLocaleFromPathname(pathname);

  // Proteção das rotas /[locale]/admin
  if (pathnameWithoutLocale.startsWith("/admin")) {
    const isPublicAdminRoute = PUBLIC_UNDER_ADMIN.some(
      (p) =>
        pathnameWithoutLocale === p ||
        pathnameWithoutLocale.startsWith(`${p}/`)
    );

    if (!isPublicAdminRoute) {
      const hasSession =
        Boolean(req.cookies.get("__Secure-next-auth.session-token")?.value) ||
        Boolean(req.cookies.get("next-auth.session-token")?.value);

      if (!hasSession) {
        const url = req.nextUrl.clone();
        url.pathname = `/${locale}/admin/login`;
        url.search = "";
        url.searchParams.set("next", pathname + search);
        return NextResponse.redirect(url);
      }
    }

    return intlMiddleware(req);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};