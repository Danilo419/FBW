// src/components/Footer.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  MapPin,
  ArrowUp,
  Instagram,
  ShieldCheck,
  Truck,
  BadgePercent,
} from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] =
    useState<"idle" | "ok" | "err" | "loading">("idle");
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function onSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    try {
      setStatus("loading");
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok && res.status !== 404) throw new Error("Failed");
      setStatus("ok");
      setEmail("");
    } catch {
      setStatus("err");
    } finally {
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="relative border-t bg-white/70">
      {/* Top CTA / Newsletter */}
      <div className="container-fw py-10 grid gap-8 md:grid-cols-[1.2fr_1fr]">
        <div className="flex items-center gap-4 rounded-2xl border p-5 glass">
          <Image
            src="/logo.png"
            alt="FootballWorld"
            width={80}
            height={80}
            className="h-14 w-auto object-contain"
            priority
          />
          <div>
            <h3 className="text-xl font-semibold">Join our newsletter</h3>
            <p className="text-gray-600 text-sm">
              New drops, discounts and featured products. No spam — unsubscribe
              anytime.
            </p>
            <div className="mt-2 flex gap-3 text-xs text-gray-500">
              <Badge
                icon={<ShieldCheck className="h-3.5 w-3.5 text-green-600" />}
              >
                Secure checkout
              </Badge>
              <Badge icon={<Truck className="h-3.5 w-3.5 text-blue-600" />}>
                Global shipping
              </Badge>
              <Badge
                icon={<BadgePercent className="h-3.5 w-3.5 text-amber-600" />}
              >
                Fair prices
              </Badge>
            </div>
          </div>
        </div>

        <form
          onSubmit={onSubscribe}
          className="rounded-2xl border p-5 glass flex flex-col sm:flex-row items-stretch gap-3"
          aria-label="Newsletter sign-up"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="flex-1 rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Email address"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center justify-center rounded-xl border px-5 py-3 font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            {status === "loading" ? "Subscribing…" : "Subscribe"}
          </button>
          {status === "ok" && (
            <div className="text-green-700 text-sm self-center">
              Subscribed! 🎉
            </div>
          )}
          {status === "err" && (
            <div className="text-red-600 text-sm self-center">
              Something went wrong.
            </div>
          )}
        </form>
      </div>

      {/* Middle: columns */}
      <div className="container-fw pb-8">
        {/* 5 colunas: Brand, Shop, Support, Contact, Information */}
        <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand / About */}
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="FootballWorld"
                width={120}
                height={120}
                className="h-12 w-auto object-contain"
              />
              <span className="sr-only">FootballWorld</span>
            </Link>
            <p className="mt-3 text-sm text-gray-600 max-w-xs">
              Concept football kits with a focus on design and quality.
              Built-to-order, global tracked shipping and secure payments.
            </p>

            {/* Socials */}
            <div className="mt-4 flex items-center gap-3">
              <Social href="https://instagram.com" label="Instagram">
                <Instagram className="h-4 w-4" />
              </Social>
              <Social href="https://tiktok.com" label="TikTok">
                <TikTokIcon className="h-4 w-4" />
              </Social>
            </div>
          </div>

          {/* Shop */}
          <FooterCol title="Shop">
            <FooterLink href="/nations">Nations</FooterLink>
            <FooterLink href="/leagues">Leagues</FooterLink>         
            <FooterLink href="/clubs">Clubs</FooterLink>
            <FooterLink href="/faq">FAQ</FooterLink>
          </FooterCol>

          {/* Support */}
          <FooterCol title="Support">
            <FooterLink href="/shipping">Shipping & Tracking</FooterLink>
            <FooterLink href="/returns">Returns & Exchanges</FooterLink>
            <FooterLink href="/size-guide">Size Guide</FooterLink>
            <FooterLink href="/contact">Contact us</FooterLink>
          </FooterCol>

          {/* Contact */}
          <FooterCol title="Contact">
            <FooterContact
              icon={<Mail className="h-4 w-4" />}
              text="myfootballworldshop@gmail.com"
              href="mailto:myfootballworldshop@gmail.com"
            />
            <FooterContact
              icon={<MapPin className="h-4 w-4" />}
              text="Worldwide shipping"
            />
          </FooterCol>

          {/* Information */}
          <FooterCol title="Information">
            <FooterLink href="/privacy-policy">Privacy Policy</FooterLink>
            <FooterLink href="/terms-of-service">Terms of Service</FooterLink>
            <FooterLink href="/shipping-policy">Shipping Policy</FooterLink>
            <FooterLink href="/return-and-refund-policy">
              Return and Refund Policy
            </FooterLink>
            <FooterLink href="/about">About Us</FooterLink>
          </FooterCol>

          {/* Payment marks */}
          <div className="lg:col-span-5 sm:col-span-2 flex items-center justify-end flex-wrap gap-2 mt-1">
            <PayMark title="Visa">
              <VisaSvg />
            </PayMark>
            <PayMark title="Mastercard">
              <MastercardSvg />
            </PayMark>
            <PayMark title="American Express">
              <AmexSvg />
            </PayMark>
            <PayMark title="PayPal">
              <PayPalSvg />
            </PayMark>
            <PayMark title="Amazon Pay">
              <AmazonPaySvg />
            </PayMark>
            <PayMark title="Multibanco">
              <MultibancoSvg />
            </PayMark>
            <PayMark title="Revolut Pay">
              <RevolutSvg />
            </PayMark>
            <PayMark title="Klarna">
              <KlarnaSvg />
            </PayMark>
            <PayMark title="Satispay">
              <SatispaySvg />
            </PayMark>
            <PayMark title="Link">
              <LinkSvg />
            </PayMark>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t">
        <div className="container-fw py-5 text-xs text-gray-500 flex items-center justify-center text-center">
          <p>© {new Date().getFullYear()} FootBallWorld. All rights reserved.</p>
        </div>
      </div>

      {/* Back to top */}
      <button
        aria-label="Back to top"
        onClick={scrollTop}
        className={`fixed bottom-6 right-6 z-[60] inline-flex items-center justify-center rounded-full border bg-white shadow-lg p-3 transition-all ${
          showTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 pointer-events-none translate-y-3"
        }`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </footer>
  );
}

/* =============== small UI helpers =============== */
function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-semibold mb-3">{title}</div>
      {/* Removemos bullets e margens de lista para evitar o “•” e desalinhamentos */}
      <ul className="space-y-2 text-sm list-none p-0 m-0">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-gray-600 hover:text-black hover:underline"
      >
        {children}
      </Link>
    </li>
  );
}

/** Item de contacto em <li>, com alinhamento no topo e quebra de linha */
function FooterContact({
  icon,
  text,
  href,
}: {
  icon: React.ReactNode;
  text: string;
  href?: string;
}) {
  return (
    <li className="list-none">
      <div className="flex items-start gap-2 text-sm text-gray-600 leading-snug">
        <span className="mt-0.5">{icon}</span>
        {href ? (
          <a
            href={href}
            className="hover:underline break-words"
            rel="nofollow noopener noreferrer"
          >
            {text}
          </a>
        ) : (
          <span className="break-words">{text}</span>
        )}
      </div>
    </li>
  );
}

function Social({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border hover:bg-gray-50"
    >
      {children}
    </Link>
  );
}

function Badge({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 bg-white/80">
      {icon}
      {children}
    </span>
  );
}

/* ===== payment mark wrapper ===== */
function PayMark({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-label={title}
      title={title}
      className="inline-flex h-7 items-center justify-center rounded-md border bg-white/90 px-2"
    >
      {children}
      <span className="sr-only">{title}</span>
    </span>
  );
}

/* ===== inline SVG marks ===== */
function PayPalSvg() {
  return (
    <svg width="30" height="18" viewBox="0 0 32 20" aria-hidden="true">
      <rect width="32" height="20" rx="4" fill="#FFC439" />
      <path
        fill="#003087"
        d="M20.5 6.2c-.2-1.3-1.4-2.2-3.2-2.2h-5l-1.6 11h2.5l.4-3.2h2.3c2.7 0 4.9-1.1 5.2-3.4a4 4 0 0 0-.6-2.2z"
      />
      <path
        fill="#009cde"
        d="M22 7.2c-.3 2.3-2.5 3.4-5.2 3.4h-2.3l-.7 4.5h2.1l.4-2.6H18c2.1 0 3.7-.7 4.1-2.9.1-.6.1-1.3 0-1.7z"
      />
    </svg>
  );
}

function AmazonPaySvg() {
  return (
    <svg width="30" height="18" viewBox="0 0 32 20" aria-hidden="true">
      <rect width="32" height="20" rx="4" fill="#232F3E" />
      <path
        d="M6 13c4.3 2.8 9.7 2.8 14 0"
        stroke="#FF9900"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MultibancoSvg() {
  return (
    <svg width="30" height="18" viewBox="0 0 32 20" aria-hidden="true">
      <rect width="32" height="20" rx="4" fill="#0B1E3B" />
      <text
        x="16"
        y="13"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="10"
        fill="#fff"
        fontWeight="700"
      >
        MB
      </text>
    </svg>
  );
}

function RevolutSvg() {
  return (
    <svg width="30" height="18" viewBox="0 0 32 20" aria-hidden="true">
      <rect width="32" height="20" rx="4" fill="#00E1A1" />
      <text
        x="16"
        y="13"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="10"
        fill="#001B2E"
        fontWeight="900"
      >
        R
      </text>
    </svg>
  );
}

function KlarnaSvg() {
  return (
    <svg width="30" height="18" viewBox="0 0 32 20" aria-hidden="true">
      <rect width="32" height="20" rx="4" fill="#FFB3C7" />
      <text
        x="16"
        y="13"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="10"
        fill="#111"
        fontWeight="900"
      >
        K
      </text>
    </svg>
  );
}

function SatispaySvg() {
  return (
    <svg width="30" height="18" viewBox="0 0 32 20" aria-hidden="true">
      <rect width="32" height="20" rx="4" fill="#FF3D2E" />
      <path
        d="M11 6l5 4-5 4M21 6l-5 4 5 4"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function LinkSvg() {
  return (
    <svg width="30" height="18" viewBox="0 0 32 20" aria-hidden="true">
      <circle cx="16" cy="10" r="8.5" fill="#00E599" />
      <path
        d="M12.8 6.6c1.6 1.5 3 2.9 4.4 4.2-1.5 1.5-2.8 2.8-4.4 4.2h2.8l4-4.2-4-4.2h-2.8z"
        fill="#072017"
      />
    </svg>
  );
}

/* ===== common card brands ===== */
function VisaSvg() {
  return (
    <svg width="30" height="18" viewBox="0 0 32 20" aria-hidden="true">
      <rect width="32" height="20" rx="4" fill="#1A1F71" />
      <text
        x="16"
        y="13"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontSize="9"
        fill="#fff"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardSvg() {
  return (
    <svg width="30" height="18" viewBox="0 0 32 20" aria-hidden="true">
      <rect width="32" height="20" rx="4" fill="#fff" stroke="#ddd" />
      <circle cx="14" cy="10" r="5.5" fill="#EB001B" />
      <circle cx="18" cy="10" r="5.5" fill="#F79E1B" opacity="0.9" />
    </svg>
  );
}

function AmexSvg() {
  return (
    <svg width="30" height="18" viewBox="0 0 32 20" aria-hidden="true">
      <rect width="32" height="20" rx="4" fill="#2E77BC" />
      <text
        x="16"
        y="13"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontSize="9"
        fill="#fff"
      >
        AMEX
      </text>
    </svg>
  );
}

/* TikTok logo */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M224 72.1c-24.4 0-44.3-19.9-44.3-44.3V24h-40.6v146.6c0 18-14.6 32.6-32.6 32.6S74 188.6 74 170.6c0-18 14.6-32.6 32.6-32.6 2.7 0 5.3.3 7.8 1V97.6c-2.6-.3-5.2-.4-7.8-.4-40.5 0-73.5 33-73.5 73.5s33 73.5 73.5 73.5c40.5 0 73.5-33 73.5-73.5v-66.5c12.2 8.7 27 13.8 43 13.8h1.8V72.1h-.3z" />
    </svg>
  );
}
