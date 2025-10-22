// src/app/auth/error/page.tsx
export const dynamic = "force-dynamic";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const raw = sp.error;
  const code = (Array.isArray(raw) ? raw[0] : raw) ?? "Unknown";

  const hints: Record<string, string> = {
    Configuration:
      "Verifica NEXTAUTH_URL e NEXTAUTH_SECRET nas variáveis de ambiente.",
    MissingSecret: "Define NEXTAUTH_SECRET em Production (Vercel).",
    CallbackRouteError:
      "Host/URL inválido. Confirma NEXTAUTH_URL com https.",
    CredentialsSignin:
      "Email ou password inválidos (isto é de login, não de config).",
    OAuthCallback:
      "Callback de OAuth. (Não aplicável se só usas Credentials.)",
  };

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
        Auth Error
      </h1>
      <p>
        <b>Code:</b> {code}
      </p>
      <p style={{ marginTop: 8, color: "#666" }}>
        {hints[code] ?? "Ver logs da função no Vercel para detalhes."}
      </p>
      <p style={{ marginTop: 16 }}>
        Endpoints úteis: <a href="/api/auth/providers">/api/auth/providers</a>{" "}
        | <a href="/api/auth/csrf">/api/auth/csrf</a> |{" "}
        <a href="/api/auth/session">/api/auth/session</a>
      </p>
    </main>
  );
}
