// src/app/reset-password/page.tsx
"use client";

import React, { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

/* ------------------------ password strength (same style as Signup) ------------------------ */
type Strength = {
  score: 0 | 1 | 2 | 3 | 4; // 0=very weak … 4=very strong
  label: "Weak" | "Fair" | "Strong" | "Very strong" | "Very weak";
  barClass: string;
  textClass: string;
};

function passwordStrength(pw: string): Strength {
  const len = pw.length;
  const sets = [
    /[a-z]/.test(pw), // lower
    /[A-Z]/.test(pw), // upper
    /\d/.test(pw), // digit
    /[^A-Za-z0-9]/.test(pw), // symbol
  ].filter(Boolean).length;

  let scoreNum = 0;
  if (len >= 8) scoreNum++;
  if (len >= 12) scoreNum++;
  if (sets >= 2) scoreNum++;
  if (sets >= 4) scoreNum++;

  const score = Math.max(0, Math.min(4, scoreNum)) as 0 | 1 | 2 | 3 | 4;

  const map: Record<number, Omit<Strength, "score">> = {
    0: { label: "Very weak", barClass: "bg-red-200", textClass: "text-red-600" },
    1: { label: "Weak", barClass: "bg-red-300", textClass: "text-red-600" },
    2: { label: "Fair", barClass: "bg-amber-300", textClass: "text-amber-700" },
    3: { label: "Strong", barClass: "bg-green-400", textClass: "text-green-700" },
    4: {
      label: "Very strong",
      barClass: "bg-emerald-500",
      textClass: "text-emerald-700",
    },
  };

  const { label, barClass, textClass } = map[score];
  return { score, label, barClass, textClass };
}

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();

  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

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

  const strength = useMemo(() => passwordStrength(password), [password]);
  const canSubmit =
    !loading &&
    !tokenInvalid &&
    password.length >= 8 &&
    strength.score >= 2 && // ✅ security rule: at least "Fair"
    confirm === password;

  const mismatch = confirm.length > 0 && confirm !== password;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    if (tokenInvalid) {
      setErr("This reset link is invalid. Please request a new one.");
      return;
    }

    // ✅ Security checks (client-side)
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    if (strength.score < 2) {
      setErr("Please choose a stronger password (at least “Fair”).");
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
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-busy={loading}>
              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  New password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    className="w-full rounded-2xl border px-4 py-3 pr-24 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={0}
                    disabled={loading}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>

                {/* Strength meter (same as Signup) */}
                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-2 ${strength.barClass} transition-all`}
                      style={{
                        width:
                          strength.score === 0
                            ? "10%"
                            : strength.score === 1
                            ? "25%"
                            : strength.score === 2
                            ? "50%"
                            : strength.score === 3
                            ? "75%"
                            : "100%",
                      }}
                    />
                  </div>
                  <div className={`mt-1 text-xs ${strength.textClass}`}>
                    {password.length ? strength.label : ""}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Use at least 8 characters. Mixing UPPER/lower case, numbers and symbols makes it stronger.
                  </p>
                  {password.length > 0 && strength.score < 2 && (
                    <p className="mt-1 text-xs text-amber-700">
                      Security check: choose at least a <b>Fair</b> password.
                    </p>
                  )}
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <label htmlFor="confirm" className="text-sm font-medium">
                  Confirm password
                </label>

                <div className="relative">
                  <input
                    id="confirm"
                    type={showPw2 ? "text" : "password"}
                    className="w-full rounded-2xl border px-4 py-3 pr-24 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw2((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                    aria-label={showPw2 ? "Hide password" : "Show password"}
                    tabIndex={0}
                    disabled={loading}
                  >
                    {showPw2 ? "Hide" : "Show"}
                  </button>
                </div>

                {mismatch && <p className="text-xs text-red-600">Passwords do not match.</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full btn-primary justify-center disabled:opacity-60"
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
