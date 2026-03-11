"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
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

export default function SignupClient() {
  const t = useTranslations("signupPage");

  const router = useRouter();
  const searchParams = useSearchParams();

  const s = useSession();
  const status = s?.status;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/account");
    }
  }, [status, router]);

  const strength = useMemo(() => passwordStrength(password), [password]);

  const canSubmit =
    !busy &&
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    confirm === password;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (password.length < 8) {
      setErr(t("errors.passwordMin"));
      return;
    }

    if (password !== confirm) {
      setErr(t("errors.passwordMismatch"));
      return;
    }

    setErr(null);
    setBusy(true);

    const next =
      searchParams.get("next") ||
      searchParams.get("callbackUrl") ||
      "/account";

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    };

    try {
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 201) {
        const result = await signIn("credentials", {
          identifier: payload.email,
          password: payload.password,
          redirect: true,
          callbackUrl: next,
        });

        if (!result) router.replace(next);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (data?.code === "USERNAME_TAKEN") {
        setErr(t("errors.usernameTaken"));
      } else if (data?.code === "EMAIL_TAKEN") {
        setErr(t("errors.emailTaken"));
      } else if (data?.message) {
        setErr(data.message);
      } else {
        setErr(t("errors.generic"));
      }
    } catch (e: any) {
      setErr(e?.message || t("errors.signupFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-fw max-w-md py-16">
      <h1 className="mb-6 text-3xl font-extrabold">{t("title")}</h1>

      <form onSubmit={onSubmit} className="space-y-4" aria-busy={busy}>
        {err && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {err}
          </p>
        )}

        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            {t("fields.name.label")}
          </label>
          <input
            id="name"
            type="text"
            className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t("fields.name.placeholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            disabled={busy}
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            {t("fields.email.label")}
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t("fields.email.placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={busy}
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            {t("fields.password.label")}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              className="w-full rounded-2xl border px-4 py-3 pr-24 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("fields.password.placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              {showPw ? t("actions.hide") : t("actions.show")}
            </button>
          </div>
        </div>

        {/* Confirm password */}
        <div className="space-y-2">
          <label htmlFor="confirm" className="text-sm font-medium">
            {t("fields.confirm.label")}
          </label>
          <div className="relative">
            <input
              id="confirm"
              type={showPw2 ? "text" : "password"}
              className="w-full rounded-2xl border px-4 py-3 pr-24 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("fields.confirm.placeholder")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => setShowPw2((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              {showPw2 ? t("actions.hide") : t("actions.show")}
            </button>
          </div>

          {confirm.length > 0 && confirm !== password && (
            <p className="text-xs text-red-600">{t("errors.passwordMismatch")}</p>
          )}

          {/* Strength meter */}
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
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
              {t(`strength.${strength.labelKey}`)}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {t("strength.tip")}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary w-full justify-center disabled:opacity-60"
        >
          {busy ? t("actions.creating") : t("actions.create")}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600">
        {t("footer.haveAccount")}{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          {t("footer.login")}
        </Link>
      </p>
    </div>
  );
}