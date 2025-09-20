// src/app/account/signup/SignupClient.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Evitar crash em build se o hook não estiver disponível em algum momento
  const s = useSession();
  const status = s?.status;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Se já estiver autenticado, mandar para /account
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/account");
    }
  }, [status, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

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
      // 1) Criar conta
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 201) {
        // 2) Login automático (NextAuth Credentials)
        //   O teu provider aceita "identifier" (nome ou email) + password
        const result = await signIn("credentials", {
          identifier: payload.email,
          password: payload.password,
          redirect: true,
          callbackUrl: next,
        });

        // Fallback no caso raro de não haver redirect
        if (!result) router.replace(next);
        return;
      }

      // Erros conhecidos do endpoint /api/account/register
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
      <h1 className="text-3xl font-extrabold mb-6">Create your account</h1>

      <form onSubmit={onSubmit} className="space-y-4" aria-busy={busy}>
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
            disabled={busy}
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
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={busy}
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
            disabled={busy}
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
        <Link href="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
