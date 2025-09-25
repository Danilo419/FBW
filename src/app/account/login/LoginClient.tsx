// src/app/account/login/LoginClient.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession, signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Regras:
 * - Não redireciona automaticamente ao entrar na página, mesmo autenticado.
 * - Decide o destino só depois de um login bem-sucedido.
 * - Respeita next/from/callbackUrl (sanitizados).
 */
export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession(); // só para UX (loading)

  // Form state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Alvos de redireção possíveis
  const qpNext = searchParams.get("next");
  const qpFrom = searchParams.get("from");
  const qpCallback = searchParams.get("callbackUrl");
  const preferredCallback = qpNext || qpFrom || qpCallback || "";

  // Map de erros via query (?error=...)
  useEffect(() => {
    const e = searchParams.get("error");
    if (!e) return;

    const map: Record<string, string> = {
      CredentialsSignin: "Invalid credentials.",
      OAuthAccountNotLinked:
        "This email is already linked to a credentials account. Log in using email & password.",
      AccessDenied: "Access denied.",
      Configuration: "Auth configuration error. Please try again later.",
      Default: "Unable to sign in. Please try again.",
    };

    setErr(map[e] || "Unable to sign in. Please try again.");
  }, [searchParams]);

  // Decide o próximo destino de forma segura
  const decideNext = (isAdmin: boolean, cb?: string | null) => {
    const clean = (cb || "").trim();

    // Bloquear não-admin em /admin
    if (!isAdmin && clean.startsWith("/admin")) return "/account";

    // Sem callback explícito → defaults seguros
    if (!clean) return isAdmin ? "/admin" : "/account";

    // Evitar redirects externos
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return isAdmin ? "/admin" : "/account";
    }

    // Admin aterrar em / ou /account → subir para /admin
    if (isAdmin && (clean === "/" || clean === "/account")) return "/admin";

    return clean;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      // Autenticar sem redirect para decidirmos nós o destino
      const res = await signIn("credentials", {
        redirect: false,
        identifier, // username OU email
        password,
      });

      if (!res) {
        setErr("Something went wrong. Please try again.");
      } else if (res.error) {
        const map: Record<string, string> = {
          CredentialsSignin: "Invalid credentials.",
          Configuration: "Auth configuration error. Please try again later.",
        };
        setErr(map[res.error] || "Unable to sign in. Please try again.");
      } else {
        // Ler sessão fresca e decidir destino
        const s = await getSession();
        const isAdmin = (s?.user as any)?.isAdmin === true;
        const next = decideNext(isAdmin, preferredCallback);
        router.replace(next);
      }
    } catch {
      setErr("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="container-fw py-16">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="container-fw py-16 max-w-md">
      <h1 className="text-3xl font-extrabold mb-6">Log in</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        {err && (
          <p className="text-red-600 text-sm rounded-md border border-red-200 bg-red-50 px-3 py-2">
            {err}
          </p>
        )}

        <div className="space-y-2">
          <label htmlFor="identifier" className="text-sm font-medium">
            Name or Email
          </label>
          <input
            id="identifier"
            type="text"
            className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="yourname or you@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary justify-center"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      {process.env.NEXT_PUBLIC_ENABLE_GOOGLE !== "false" && (
        <>
          <div className="my-6 text-center text-sm text-gray-500">or</div>
          <button
            onClick={() =>
              signIn("google", {
                // Usa o callback preferido se existir; caso contrário envia para /account
                // (o role será decidido no callback server, se precisares)
                callbackUrl: preferredCallback || "/account",
              })
            }
            className="w-full btn-outline justify-center"
          >
            Continue with Google
          </button>
        </>
      )}

      <p className="mt-6 text-sm text-gray-600">
        Don’t have an account?{" "}
        <Link href="/account/signup" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
