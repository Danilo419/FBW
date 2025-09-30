// src/app/account/login/LoginClient.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession, signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Rules:
 * - Do not auto-redirect just for being authenticated.
 * - Decide the destination only after a successful login.
 * - Respect next/from/callbackUrl (sanitized).
 */
export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession(); // UI loading state only

  // Form state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Possible redirect targets
  const qpNext = searchParams.get("next");
  const qpFrom = searchParams.get("from");
  const qpCallback = searchParams.get("callbackUrl");
  const preferredCallback = qpNext || qpFrom || qpCallback || "";

  // Map error via query (?error=...)
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

  // Decide next route safely
  const decideNext = (isAdmin: boolean, cb?: string | null) => {
    const clean = (cb || "").trim();

    // Block non-admin to /admin
    if (!isAdmin && clean.startsWith("/admin")) return "/account";

    // No explicit callback → safe defaults
    if (!clean) return isAdmin ? "/admin" : "/account";

    // Avoid external redirects
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return isAdmin ? "/admin" : "/account";
    }

    // Admin landing on / or /account → go to /admin
    if (isAdmin && (clean === "/" || clean === "/account")) return "/admin";

    return clean;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      // Authenticate without redirect so we choose destination
      const res = await signIn("credentials", {
        redirect: false,
        identifier, // username OR email
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
        // Read fresh session and decide destination
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

      <p className="mt-6 text-sm text-gray-600">
        Don’t have an account?{" "}
        <Link href="/account/signup" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
