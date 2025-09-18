// src/app/account/login/LoginClient.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession, signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Evita destructuring direto (SSR safe)
  const s = useSession();
  const status = s?.status;
  const session = s?.data;

  // Name OR Email
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rawCallbackUrl = searchParams.get("callbackUrl") || "/account";

  // Decide para onde ir com base em ser admin e no callbackUrl
  const decideNext = (isAdmin: boolean, cb: string) => {
    // se não for admin e o callback levar para /admin, manda para /account
    if (!isAdmin && cb?.startsWith("/admin")) return "/account";
    // se for admin, envia para /admin (a não ser que o callback seja outra coisa explícita tua)
    if (isAdmin && (cb === "/account" || cb === "/")) return "/admin";
    return cb || (isAdmin ? "/admin" : "/account");
  };

  // Se já estiver autenticado e aterrar no /account/login, redireciona logo
  useEffect(() => {
    if (status === "authenticated") {
      const isAdmin = (session?.user as any)?.isAdmin === true;
      const next = decideNext(isAdmin, rawCallbackUrl);
      router.replace(next);
    }
  }, [status, session, rawCallbackUrl, router]);

  // Mostra erros do NextAuth (?error=...)
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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        identifier, // name OR email
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
        // Lê sessão atualizada para ver se é admin
        const s = await getSession();
        const isAdmin = (s?.user as any)?.isAdmin === true;
        const next = decideNext(isAdmin, rawCallbackUrl);
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

        <button type="submit" disabled={loading} className="w-full btn-primary justify-center">
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      {process.env.NEXT_PUBLIC_ENABLE_GOOGLE !== "false" && (
        <>
          <div className="my-6 text-center text-sm text-gray-500">or</div>
          <button
            onClick={() =>
              signIn("google", {
                callbackUrl: rawCallbackUrl,
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
