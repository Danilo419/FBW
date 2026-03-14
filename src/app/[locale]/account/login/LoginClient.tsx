// src/app/[locale]/account/login/LoginClient.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession, signIn, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/**
 * Rules:
 * - Do not auto-redirect just for being authenticated.
 * - Decide the destination only after a successful login.
 * - Respect next/from/callbackUrl (sanitized).
 */
export default function LoginClient() {
  const t = useTranslations("loginPage");

  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const qpNext = searchParams.get("next");
  const qpFrom = searchParams.get("from");
  const qpCallback = searchParams.get("callbackUrl");
  const preferredCallback = qpNext || qpFrom || qpCallback || "";

  const forgotPasswordHref = useMemo(() => {
    const query =
      qpNext
        ? { next: qpNext }
        : qpFrom
          ? { from: qpFrom }
          : qpCallback
            ? { callbackUrl: qpCallback }
            : undefined;

    return query
      ? { pathname: "/account/forgot-password", query }
      : { pathname: "/account/forgot-password" };
  }, [qpNext, qpFrom, qpCallback]);

  const signupHref = useMemo(() => {
    const query =
      qpNext
        ? { next: qpNext }
        : qpFrom
          ? { from: qpFrom }
          : qpCallback
            ? { callbackUrl: qpCallback }
            : undefined;

    return query
      ? { pathname: "/account/signup", query }
      : { pathname: "/account/signup" };
  }, [qpNext, qpFrom, qpCallback]);

  useEffect(() => {
    const e = searchParams.get("error");
    if (!e) return;

    const map: Record<string, string> = {
      CredentialsSignin: t("errors.invalidCredentials"),
      OAuthAccountNotLinked: t("errors.oauthNotLinked"),
      AccessDenied: t("errors.accessDenied"),
      Configuration: t("errors.configuration"),
      Default: t("errors.default"),
    };

    setErr(map[e] || t("errors.default"));
  }, [searchParams, t]);

  const decideNext = (isAdmin: boolean, cb?: string | null) => {
    const clean = (cb || "").trim();

    if (!isAdmin && clean.startsWith("/admin")) return "/account";

    if (!clean) return isAdmin ? "/admin" : "/account";

    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return isAdmin ? "/admin" : "/account";
    }

    if (isAdmin && (clean === "/" || clean === "/account")) return "/admin";

    return clean;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        identifier,
        password,
      });

      if (!res) {
        setErr(t("errors.generic"));
      } else if (res.error) {
        const map: Record<string, string> = {
          CredentialsSignin: t("errors.invalidCredentials"),
          Configuration: t("errors.configuration"),
        };

        setErr(map[res.error] || t("errors.default"));
      } else {
        const s = await getSession();
        const isAdmin = (s?.user as any)?.isAdmin === true;
        const next = decideNext(isAdmin, preferredCallback);
        router.replace(next as "/account" | "/admin" | "/");
      }
    } catch {
      setErr(t("errors.unexpected"));
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="container-fw py-16">
        <p>{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="container-fw max-w-md py-16">
      <h1 className="mb-6 text-3xl font-extrabold">{t("title")}</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        {err && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {err}
          </p>
        )}

        <div className="space-y-2">
          <label htmlFor="identifier" className="text-sm font-medium">
            {t("fields.identifier.label")}
          </label>

          <input
            id="identifier"
            type="text"
            className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t("fields.identifier.placeholder")}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            {t("fields.password.label")}
          </label>

          <input
            id="password"
            type="password"
            className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t("fields.password.placeholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            minLength={6}
          />

          <div className="text-right">
            <Link
              href={forgotPasswordHref}
              className="text-sm text-blue-600 hover:underline"
            >
              {t("links.forgotPassword")}
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center"
        >
          {loading ? t("actions.loggingIn") : t("actions.logIn")}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600">
        {t("footer.noAccount")}{" "}
        <Link href={signupHref} className="text-blue-600 hover:underline">
          {t("footer.signUp")}
        </Link>
      </p>
    </div>
  );
}