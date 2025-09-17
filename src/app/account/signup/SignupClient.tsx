// src/app/account/signup/SignupClient.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Avoid destructuring directly to prevent build-time crashes if useSession is undefined
  const s = useSession();
  const status = s?.status;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // If already logged in, go to account
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/account");
    }
  }, [status, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    const callbackUrl = searchParams.get("callbackUrl") || "/account";

    try {
      // Create account
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Sign up failed");
      }

      // Auto sign-in after successful signup (if credentials provider is configured)
      const si = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (si && !si.error) {
        router.replace(si.url || callbackUrl);
      } else {
        // Fallback: send to login
        router.replace(`/account/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
    } catch (e: any) {
      setErr(e?.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-fw py-16 max-w-md">
      <h1 className="text-3xl font-extrabold mb-6">Create your account</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        {err && (
          <p className="text-red-600 text-sm rounded-md border border-red-200 bg-red-50 px-3 py-2">
            {err}
          </p>
        )}

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

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
            autoComplete="new-password"
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full btn-primary justify-center"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/account/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
