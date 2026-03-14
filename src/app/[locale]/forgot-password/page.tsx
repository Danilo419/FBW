// src/app/[locale]/forgot-password/page.tsx
"use client";

import React, { FormEvent, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const t = useTranslations("forgotPasswordPage");
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loginHref = useMemo(() => {
    const qpNext = searchParams.get("next");
    const qpFrom = searchParams.get("from");
    const qpCallback = searchParams.get("callbackUrl");

    const query = qpNext
      ? { next: qpNext }
      : qpFrom
        ? { from: qpFrom }
        : qpCallback
          ? { callbackUrl: qpCallback }
          : undefined;

    return query
      ? { pathname: "/account/login" as const, query }
      : { pathname: "/account/login" as const };
  }, [searchParams]);

  const signupHref = useMemo(() => {
    const qpNext = searchParams.get("next");
    const qpFrom = searchParams.get("from");
    const qpCallback = searchParams.get("callbackUrl");

    const query = qpNext
      ? { next: qpNext }
      : qpFrom
        ? { from: qpFrom }
        : qpCallback
          ? { callbackUrl: qpCallback }
          : undefined;

    return query
      ? { pathname: "/account/signup" as const, query }
      : { pathname: "/account/signup" as const };
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

      if (!res.ok) {
        setErr(t("errors.generic"));
      } else {
        setSent(true);
      }
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

          <p className="mt-2 text-sm text-gray-600">{t("description")}</p>

          {err && (
            <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {err}
            </p>
          )}

          {sent ? (
            <div className="mt-6 space-y-4">
              <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {t("success")}
              </p>

              <div className="flex items-center justify-between gap-3">
                <Link
                  href={loginHref}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t("links.backLogin")}
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setErr(null);
                  }}
                  className="text-sm text-gray-600 hover:underline"
                >
                  {t("links.useDifferent")}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  {t("fields.email.label")}
                </label>

                <input
                  id="email"
                  type="email"
                  required
                  placeholder={t("fields.email.placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center"
              >
                {loading ? t("actions.sending") : t("actions.send")}
              </button>

              <div className="flex items-center justify-between gap-3">
                <Link
                  href={loginHref}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t("links.backLogin")}
                </Link>

                <Link
                  href={signupHref}
                  className="text-sm text-gray-600 hover:underline"
                >
                  {t("links.createAccount")}
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          {t("securityNote")}
        </p>
      </div>
    </div>
  );
}