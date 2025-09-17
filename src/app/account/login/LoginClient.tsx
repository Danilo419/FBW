// src/app/account/login/LoginClient.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, go to account
  useEffect(() => {
    if (status === "authenticated") router.replace("/account");
  }, [status, router]);

  // Surface any NextAuth error from query (?error=...)
  useEffect(() => {
    const e = searchParams.get("error");
    if (!e) return;
    const map: Record<string, string> = {
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

    const callbackUrl = searchParams.get("callbackUrl") || "/account";

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (!res) setErr("Something went wrong. Please try again.");
      else if (res.error) setErr("Invalid email or password.");
      else router.push(res.url || callbackUrl);
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
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
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
                callbackUrl: searchParams.get("callbackUrl") || "/account",
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
