// src/app/forgot-password/page.tsx
"use client";

import React, { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Preserve redirect params (so after reset/login you can continue the flow)
  const preservedQuery = useMemo(() => {
    const qpNext = searchParams.get("next");
    const qpFrom = searchParams.get("from");
    const qpCallback = searchParams.get("callbackUrl");

    const params = new URLSearchParams();
    if (qpNext) params.set("next", qpNext);
    else if (qpFrom) params.set("from", qpFrom);
    else if (qpCallback) params.set("callbackUrl", qpCallback);

    const s = params.toString();
    return s ? `?${s}` : "";
  }, [searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // We always show success (security), but still handle network errors
      if (!res.ok) {
        setErr("Something went wrong. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-fw py-16">
      <div className="max-w-md mx-auto">
        <div className="rounded-2xl border bg-white/80 shadow-sm p-6 sm:p-8">
          <h1 className="text-3xl font-extrabold">Reset your password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email and we’ll send you a password reset link.
          </p>

          {err && (
            <p className="mt-5 text-red-600 text-sm rounded-md border border-red-200 bg-red-50 px-3 py-2">
              {err}
            </p>
          )}

          {sent ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-green-700 rounded-md border border-green-200 bg-green-50 px-3 py-2">
                If this email exists, we sent you a reset link. Please check your
                inbox (and spam/junk).
              </p>

              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/account/login${preservedQuery}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Back to login
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setErr(null);
                  }}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Use a different email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary justify-center"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>

              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/account/login${preservedQuery}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Back to login
                </Link>

                <Link
                  href={`/account/signup${preservedQuery}`}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Create an account
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          For security, we don’t confirm whether an email is registered.
        </p>
      </div>
    </div>
  );
}
