// src/lib/session-cart.ts
import { cookies } from "next/headers";

const COOKIE = "cart_id";

export async function getCartCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function setCartCookie(id: string) {
  const jar = await cookies();
  jar.set(COOKIE, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    // ajusta domínio/secure consoante ambiente
  });
}

export async function clearCartCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
