// src/lib/resend.ts
import { Resend } from "resend";

/**
 * Resend client
 * A API key vem das env vars (Vercel em produção, .env.local em dev)
 */
export const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Email FROM
 * ⚠️ TEM de usar o domínio verificado no Resend
 */
export const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  "FootballWorld <no-reply@myfootballworldstore.com>";

/**
 * Reply-To (opcional)
 */
export const EMAIL_REPLY_TO =
  process.env.EMAIL_REPLY_TO ||
  "support@myfootballworldstore.com";
