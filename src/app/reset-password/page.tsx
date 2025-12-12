// src/app/reset-password/page.tsx
"use client";

import React, { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();

  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Preserve redirect params (so user can continue checkout flow after logging in)
  const preservedQuery = useMemo(() => {
    const qpNext = params.get("next");
    const qpFrom = params.get("from");
    const qpCallback = params.get("callbackUrl");

    const p = new URLSearchParams();
    if (qpNext) p.set("next", qpNext);
    else if (qpFrom) p.set("from", qpFrom);
    else if (qpCallback) p.set("callbackUrl", qpCallback);

    const s = p.toString();
    return s ? `?${s}` : "";
  }, [params]);

  const tokenInvalid = !token || token.length < 10;

  function strengthLabel(pw: string) {
    if (!pw) return { label: "", score: 0 };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    const labels = ["Weak", "Ok", "Good", "Strong", "Very strong"];
    return { label: labels[Math.max(0, Math.min(4, score - 1))] || "Weak", score };
  }

  const strength = useMemo(() => strengthLabel(password), [password]);
  const mismatch = confirm.length > 0 && password !== confirm;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    if (tokenInvalid) {
      setErr("This reset link is invalid. Please request a new one.");
      return;
    }

    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErr(data?.error || "Unable to reset password. Please try again.");
        return;
      }

      setDone(true);

      // Give a short moment so the user sees success, then go to login
      setTimeout(() => {
        router.push(`/account/login${preservedQuery}`);
      }, 700);
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
          <h1 className="text-3xl font-extrabold">New password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Choose a strong password to keep your FootballWorld account safe.
          </p>

          {tokenInvalid && (
            <p className="mt-5 text-amber-700 text-sm rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              This reset link looks invalid or incomplete.{" "}
              <Link href="/forgot-password" className="underline">
                Request a new link
              </Link>
              .
            </p>
          )}

          {err && (
            <p className="mt-5 text-red-600 text-sm rounded-md border border-red-200 bg-red-50 px-3 py-2">
              {err}
            </p>
          )}

          {done ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-green-700 rounded-md border border-green-200 bg-green-50 px-3 py-2">
                Password updated successfully. Redirecting to login…
              </p>

              <Link
                href={`/account/login${preservedQuery}`}
                className="text-sm text-blue-600 hover:underline"
              >
                Go to login now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="password" className="text-sm font-medium">
                    New password
                  </label>

                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>

                <input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="new-password"
                  minLength={8}
                />

                {!!password && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      Use 8+ chars, mix letters, numbers, symbols.
                    </span>
                    <span className="font-medium text-gray-700">
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm" className="text-sm font-medium">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type={show ? "text" : "password"}
                  required
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="new-password"
                  minLength={8}
                />

                {mismatch && (
                  <p className="text-xs text-red-600">Passwords do not match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || tokenInvalid}
                className="w-full btn-primary justify-center"
              >
                {loading ? "Resetting…" : "Reset password"}
              </button>

              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/account/login${preservedQuery}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Back to login
                </Link>

                <Link
                  href={`/forgot-password${preservedQuery}`}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Request a new link
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-500 text-center">
          If you keep having issues, request a new reset link.
        </p>
      </div>
    </div>
  );
}
