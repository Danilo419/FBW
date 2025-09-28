// src/app/account/login/LoginClient.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession, signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Rules:
 * - Do not auto-redirect on page load, even if already authenticated.
 * - Decide destination only after a successful login.
 * - Respect next/from/callbackUrl (sanitized).
 */
export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession(); // UX only (loading)

  // Form state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Possible redirect targets
  const qpNext = searchParams.get("next");
  const qpFrom = searchParams.get("from");
  const qpCallback = searchParams.get("callbackUrl");
  const preferredCallback = qpNext || qpFrom || qpCallback || "";

  // Map error messages via query (?error=...)
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

  // Safely decide next route after login
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

    // Admin landing on / or /account → send to /admin
    if (isAdmin && (clean === "/" || clean === "/account")) return "/admin";

    return clean;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      // Authenticate without redirect so we can decide destination
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

  const onGoogle = async () => {
    try {
      setGoogleLoading(true);
      await signIn("google", {
        callbackUrl: preferredCallback || "/account",
      });
      // NextAuth will redirect; no need to unset loading here
    } catch {
      setGoogleLoading(false);
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
          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">or</span>
            </div>
          </div>

          {/* Stylish Google button */}
          <button
            type="button"
            onClick={onGoogle}
            aria-label="Continue with Google"
            className={[
              "w-full rounded-xl border bg-white px-4 py-2.5 shadow-sm",
              "hover:bg-gray-50 active:bg-gray-100",
              "transition-colors",
              "flex items-center justify-center gap-3",
              "text-gray-900",
              "dark:bg-neutral-900 dark:text-white dark:border-neutral-700 dark:hover:bg-neutral-800",
              googleLoading ? "opacity-70 cursor-wait" : "cursor-pointer",
            ].join(" ")}
            disabled={googleLoading}
          >
            <GoogleIcon className="h-5 w-5" />
            <span className="font-medium">Continue with Google</span>
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

/** Official multicolor Google “G” icon (SVG). */
function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.957 3.043l5.657-5.657C33.826 6.053 29.139 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20c11.045 0 20-8.955 20-20 0-1.341-.138-2.651-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.814C14.39 15.261 18.856 12 24 12c3.059 0 5.842 1.153 7.957 3.043l5.657-5.657C33.826 6.053 29.139 4 24 4 16.318 4 9.645 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.168 0 9.9-1.973 13.457-5.186l-6.206-5.254C29.2 35.655 26.748 36.6 24 36.6c-5.196 0-9.61-3.317-11.242-7.93l-6.545 5.04C9.51 39.62 16.194 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.02 12.02 0 0 1-4.052 5.56l6.206 5.254C39.018 35.92 44 30.4 44 24c0-1.341-.138-2.651-.389-3.917z"
      />
    </svg>
  );
}
