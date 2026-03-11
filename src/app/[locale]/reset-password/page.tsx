"use client";

import React, { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/* ------------------------ password strength ------------------------ */
type Strength = {
  score: 0 | 1 | 2 | 3 | 4;
  labelKey: "veryWeak" | "weak" | "fair" | "strong" | "veryStrong";
  barClass: string;
  textClass: string;
};

function passwordStrength(pw: string): Strength {
  const len = pw.length;

  const sets = [
    /[a-z]/.test(pw),
    /[A-Z]/.test(pw),
    /\d/.test(pw),
    /[^A-Za-z0-9]/.test(pw),
  ].filter(Boolean).length;

  let scoreNum = 0;

  if (len >= 8) scoreNum++;
  if (len >= 12) scoreNum++;
  if (sets >= 2) scoreNum++;
  if (sets >= 4) scoreNum++;

  const score = Math.max(0, Math.min(4, scoreNum)) as 0 | 1 | 2 | 3 | 4;

  const map: Record<number, Omit<Strength, "score">> = {
    0: { labelKey: "veryWeak", barClass: "bg-red-200", textClass: "text-red-600" },
    1: { labelKey: "weak", barClass: "bg-red-300", textClass: "text-red-600" },
    2: { labelKey: "fair", barClass: "bg-amber-300", textClass: "text-amber-700" },
    3: { labelKey: "strong", barClass: "bg-green-400", textClass: "text-green-700" },
    4: { labelKey: "veryStrong", barClass: "bg-emerald-500", textClass: "text-emerald-700" },
  };

  const { labelKey, barClass, textClass } = map[score];

  return { score, labelKey, barClass, textClass };
}

export default function ResetPasswordPage() {
  const t = useTranslations("resetPasswordPage");

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
    strength.score >= 2 &&
    confirm === password;

  const mismatch = confirm.length > 0 && confirm !== password;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    if (tokenInvalid) {
      setErr(t("errors.invalidLink"));
      return;
    }

    if (password.length < 8) {
      setErr(t("errors.minLength"));
      return;
    }

    if (strength.score < 2) {
      setErr(t("errors.weakPassword"));
      return;
    }

    if (password !== confirm) {
      setErr(t("errors.passwordMismatch"));
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
        setErr(data?.error || t("errors.generic"));
        return;
      }

      setDone(true);

      setTimeout(() => {
        router.push(`/account/login${preservedQuery}`);
      }, 700);
    } catch {
      setErr(t("errors.network"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-fw py-16">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border bg-white/80 p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-extrabold">{t("title")}</h1>

          <p className="mt-2 text-sm text-gray-600">
            {t("description")}
          </p>

          {tokenInvalid && (
            <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {t("invalidLinkText")}{" "}
              <Link href="/forgot-password" className="underline">
                {t("requestNew")}
              </Link>
              .
            </p>
          )}

          {err && (
            <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {err}
            </p>
          )}

          {done ? (
            <div className="mt-6 space-y-4">
              <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {t("success")}
              </p>

              <Link
                href={`/account/login${preservedQuery}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {t("loginNow")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  {t("fields.password")}
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
                    minLength={8}
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {showPw ? t("hide") : t("show")}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div className="space-y-2">
                <label htmlFor="confirm" className="text-sm font-medium">
                  {t("fields.confirm")}
                </label>

                <div className="relative">
                  <input
                    id="confirm"
                    type={showPw2 ? "text" : "password"}
                    className="w-full rounded-2xl border px-4 py-3 pr-24 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t("fields.confirmPlaceholder")}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPw2((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {showPw2 ? t("hide") : t("show")}
                  </button>
                </div>

                {mismatch && (
                  <p className="text-xs text-red-600">
                    {t("errors.passwordMismatch")}
                  </p>
                )}
              </div>

              {/* Strength */}
              <div className="mt-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-2 ${strength.barClass}`}
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
                  {password.length ? t(`strength.${strength.labelKey}`) : ""}
                </div>

                <p className="mt-1 text-xs text-gray-500">
                  {t("strength.tip")}
                </p>

                {password.length > 0 && strength.score < 2 && (
                  <p className="mt-1 text-xs text-amber-700">
                    {t("strength.security")}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-primary w-full justify-center disabled:opacity-60"
              >
                {loading ? t("actions.resetting") : t("actions.reset")}
              </button>

              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/account/login${preservedQuery}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t("links.backLogin")}
                </Link>

                <Link
                  href={`/forgot-password${preservedQuery}`}
                  className="text-sm text-gray-600 hover:underline"
                >
                  {t("links.requestNew")}
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          {t("footer")}
        </p>
      </div>
    </div>
  );
}