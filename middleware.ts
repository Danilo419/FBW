// middleware.ts
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";

const PUBLIC_UNDER_ADMIN = ["/admin/login", "/admin/logout"];
const intlMiddleware = createMiddleware(routing);

function getLocales(): string[] {
  return [...routing.locales];
}

function getLocaleFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const locales = getLocales();

  if (firstSegment && locales.includes(firstSegment)) {
    return firstSegment;
  }

  return routing.defaultLocale;
}

function stripLocaleFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const locales = getLocales();

  if (firstSegment && locales.includes(firstSegment)) {
    const stripped = "/" + segments.slice(1).join("/");
    return stripped || "/";
  }

  return pathname;
}

function hasAuthSessionCookie(req: NextRequest): boolean {
  return (
    Boolean(req.cookies.get("__Secure-next-auth.session-token")?.value) ||
    Boolean(req.cookies.get("next-auth.session-token")?.value)
  );
}

export default function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_vercel") ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const pathnameWithoutLocale = stripLocaleFromPathname(pathname);

  // Deixa o next-intl tratar primeiro locale/rewrite/redirect
  const intlResponse = intlMiddleware(req);

  if (!pathnameWithoutLocale.startsWith("/admin")) {
    return intlResponse;
  }

  const isPublicAdminRoute = PUBLIC_UNDER_ADMIN.some(
    (p) => pathnameWithoutLocale === p || pathnameWithoutLocale.startsWith(`${p}/`)
  );

  if (isPublicAdminRoute) {
    return intlResponse;
  }

  if (hasAuthSessionCookie(req)) {
    return intlResponse;
  }

  // ⚠️ usar sempre locale já resolvido pelo pathname ou fallback
  const locale = getLocaleFromPathname(pathname);

  const url = req.nextUrl.clone();
  url.pathname = `/${locale}/admin/login`;
  url.search = "";
  url.searchParams.set("next", pathname + search);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};