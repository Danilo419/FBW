// middleware.ts (na raiz do repositório)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PREFIX = "/admin";

// Rotas dentro de /admin que não devem ser bloqueadas (se existirem)
const PUBLIC_UNDER_ADMIN = ["/admin/login", "/admin/logout"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // (Devido ao matcher, isto quase nunca é chamado fora de /admin, mas fica a salvaguarda)
  if (!pathname.startsWith(ADMIN_PREFIX)) {
    return NextResponse.next();
  }

  // Isenta rotas públicas específicas dentro de /admin (opcional)
  if (PUBLIC_UNDER_ADMIN.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Verifica cookies de sessão do NextAuth (dev e prod)
  const hasSession =
    Boolean(req.cookies.get("__Secure-next-auth.session-token")?.value) ||
    Boolean(req.cookies.get("next-auth.session-token")?.value);

  // Sem sessão → redireciona para /login preservando o destino
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // Sessão presente → segue
  return NextResponse.next();
}

// **Importante**: limitar o middleware apenas a /admin para evitar loops
export const config = {
  matcher: ["/admin/:path*"],
};
