// src/app/account/signup/SignupClient.tsx
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

/* ------------------------ password strength ------------------------ */
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

  // usar number e só no fim transformar para o union 0|1|2|3|4
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
    4: { label: "Very strong", barClass: "bg-emerald-500", textClass: "text-emerald-700" },
  };

  const { label, barClass, textClass } = map[score];
  return { score, label, barClass, textClass };
}

export default function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const s = useSession(); // safe on build
  const status = s?.status;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // If already authenticated, go to /account
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

    // client validations
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
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
      // 1) Create account
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 201) {
        // 2) Auto login (NextAuth Credentials)
        const result = await signIn("credentials", {
          identifier: payload.email,
          password: payload.password,
          redirect: true,
          callbackUrl: next,
        });

        if (!result) router.replace(next); // rare fallback
        return;
      }

      // handle API errors
      const data = await res.json().catch(() => ({}));
      if (data?.code === "USERNAME_TAKEN") {
        setErr("A user with this name already exists. Please choose another name.");
      } else if (data?.code === "EMAIL_TAKEN") {
        setErr("An account with this email already exists.");
      } else if (data?.message) {
        setErr(data.message);
      } else {
        setErr("Could not create account. Please try again.");
      }
    } catch (e: any) {
      setErr(e?.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-fw py-16 max-w-md">
      <h1 className="text-3xl font-extrabold mb-6">Sign up</h1>

      <form onSubmit={onSubmit} className="space-y-4" aria-busy={busy}>
        {err && (
          <p className="text-red-600 text-sm rounded-md border border-red-200 bg-red-50 px-3 py-2">
            {err}
          </p>
        )}

        {/* Name */}
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
            disabled={busy}
          />
        </div>

        {/* Email */}
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
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={busy}
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
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
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
              aria-label={showPw ? "Hide password" : "Show password"}
              tabIndex={0}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {/* Strength meter */}
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
              {strength.label}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Use at least 8 characters. Mixing UPPER/lower case, numbers and symbols makes it stronger.
            </p>
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
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => setShowPw2((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
              aria-label={showPw2 ? "Hide password" : "Show password"}
              tabIndex={0}
            >
              {showPw2 ? "Hide" : "Show"}
            </button>
          </div>
          {confirm.length > 0 && confirm !== password && (
            <p className="text-xs text-red-600">Passwords do not match.</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full btn-primary justify-center disabled:opacity-60"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
