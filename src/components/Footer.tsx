"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Mail,
  MapPin,
  ArrowUp,
  Instagram,
  Youtube,
  Facebook,
  ShieldCheck,
  Truck,
  BadgePercent,
} from "lucide-react";

export default function Footer() {
  const t = useTranslations("Footer");

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
    const trimmed = email.trim();
    if (!trimmed) return;

    try {
      setStatus("loading");

      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        let msg = "Failed";
        try {
          const data = await res.json();
          if (data?.error) msg = String(data.error);
        } catch {}
        throw new Error(msg);
      }

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
    <footer className="relative border-t bg-white">
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
            <h3 className="text-xl font-semibold">{t("newsletterTitle")}</h3>
            <p className="text-gray-600 text-sm">
              {t("newsletterText")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
              <Badge
                icon={<ShieldCheck className="h-3.5 w-3.5 text-green-600" />}
              >
                {t("secureCheckout")}
              </Badge>
              <Badge icon={<Truck className="h-3.5 w-3.5 text-blue-600" />}>
                {t("globalShipping")}
              </Badge>
              <Badge
                icon={<BadgePercent className="h-3.5 w-3.5 text-amber-600" />}
              >
                {t("fairPrices")}
              </Badge>
            </div>
          </div>
        </div>

        <form
          onSubmit={onSubscribe}
          className="rounded-2xl border p-5 glass flex flex-col sm:flex-row items-stretch gap-3"
          aria-label={t("newsletterAria")}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("yourEmail")}
            className="flex-1 rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={t("emailAddress")}
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center justify-center rounded-xl border px-5 py-3 font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            {status === "loading" ? t("subscribing") : t("subscribe")}
          </button>

          {status === "ok" && (
            <div className="text-green-700 text-sm self-center">
              {t("subscribed")}
            </div>
          )}
          {status === "err" && (
            <div className="text-red-600 text-sm self-center">
              {t("somethingWentWrong")}
            </div>
          )}
        </form>
      </div>

      <div className="container-fw pb-8">
        <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-5">
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
              {t("brandText")}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <Social
                href="https://www.facebook.com/profile.php?id=61577992120797"
                label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </Social>

              <Social
                href="https://www.instagram.com/footballworld_store/"
                label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </Social>

              <Social
                href="https://www.tiktok.com/@footballworld_store"
                label="TikTok"
              >
                <TikTokIcon className="h-4 w-4" />
              </Social>

              <Social
                href="https://www.youtube.com/@FootBallWorld_Store"
                label="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </Social>
            </div>
          </div>

          <FooterCol title={t("shop")}>
            <FooterLink href="/nations">{t("nations")}</FooterLink>
            <FooterLink href="/leagues">{t("leagues")}</FooterLink>
            <FooterLink href="/clubs">{t("clubs")}</FooterLink>
            <FooterLink href="/faq">{t("faq")}</FooterLink>
          </FooterCol>

          <FooterCol title={t("support")}>
            <FooterLink href="/shipping">{t("shippingTracking")}</FooterLink>
            <FooterLink href="/returns">{t("returnsExchanges")}</FooterLink>
            <FooterLink href="/size-guide">{t("sizeGuide")}</FooterLink>
            <FooterLink href="/contact">{t("contactUs")}</FooterLink>
          </FooterCol>

          <FooterCol title={t("contact")}>
            <FooterContact
              icon={<Mail className="h-4 w-4" />}
              text="myfootballworldstore@gmail.com"
              href="mailto:myfootballworldstore@gmail.com"
            />
            <FooterContact
              icon={<MapPin className="h-4 w-4" />}
              text={t("worldwideShipping")}
            />
          </FooterCol>

          <FooterCol title={t("information")}>
            <FooterLink href="/privacy-policy">{t("privacyPolicy")}</FooterLink>
            <FooterLink href="/terms-of-service">{t("termsOfService")}</FooterLink>
            <FooterLink href="/shipping-policy">{t("shippingPolicy")}</FooterLink>
            <FooterLink href="/return-and-refund-policy">
              {t("returnRefundPolicy")}
            </FooterLink>
            <FooterLink href="/about">{t("aboutUs")}</FooterLink>
          </FooterCol>

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

      <div className="border-t">
        <div className="container-fw py-5 text-xs text-gray-500 flex items-center justify-center text-center">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>

      <button
        aria-label={t("backToTop")}
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