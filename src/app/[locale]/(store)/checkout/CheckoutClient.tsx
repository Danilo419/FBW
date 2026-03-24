// src/app/[locale]/(store)/checkout/CheckoutClient.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

type StripeMethod =
  | 'card'
  | 'multibanco'
  | 'revolut_pay'
  | 'klarna'
  | 'satispay'
  | 'amazon_pay'
  | 'automatic'
  | 'link';

/* ---------- HTTP helpers ---------- */
async function startStripe(method: StripeMethod, locale: string) {
  const res = await fetch('/api/checkout/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, locale }),
  });

  const data = (await res.json()) as { url?: string; error?: string };

  if (!res.ok) throw new Error(data.error || 'Stripe error');
  if (!data.url) throw new Error('Stripe did not return a checkout URL');

  window.location.href = String(data.url);
}

async function startPayPal() {
  const res = await fetch('/api/checkout/paypal/start', { method: 'POST' });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'PayPal error');
  if (!data.approveUrl) throw new Error('PayPal did not return approveUrl');

  window.location.href = String(data.approveUrl);
}

/* ---------- Icons ---------- */
const IconCard = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <rect x="2" y="6" width="20" height="12" rx="2" fill="#111" />
    <rect x="4" y="9" width="16" height="2" fill="#fff" />
    <rect x="4" y="13" width="8" height="2" fill="#ccc" />
  </svg>
);

const IconPayPal = () => (
  <svg width="24" height="24" viewBox="0 0 32 32">
    <path fill="#003087" d="M23.5 9.3c-.3-2.1-2.2-3.3-4.8-3.3H11l-2.5 17h3.7l.7-5h3.5c4.1 0 7.4-1.7 7.8-5.2.1-.5.1-1 0-1.5z" />
    <path fill="#009cde" d="M25.9 10.8c-.5 3.5-3.7 5.2-7.8 5.2h-3.5l-1 7h3.1l.6-4h2.4c3.1 0 5.6-1.1 6.3-4.4.2-1 .2-2 0-2.8z" />
  </svg>
);

/* ---------- Button ---------- */
function PayButton({
  label,
  onClick,
  loading,
  variant = 'outline',
  left,
}: {
  label: string;
  onClick: () => Promise<void> | void;
  loading: boolean;
  variant?: 'primary' | 'paypal' | 'outline';
  left?: ReactNode;
}) {
  const base =
    'w-full rounded-2xl px-5 py-3 font-semibold transition flex items-center justify-center gap-3 disabled:opacity-60';

  const styles =
    variant === 'primary'
      ? 'bg-black text-white hover:bg-gray-900'
      : variant === 'paypal'
      ? 'bg-[#FFC439] text-black hover:brightness-95'
      : 'border hover:bg-gray-50';

  return (
    <button className={`${base} ${styles}`} onClick={onClick} disabled={loading}>
      {left}
      <span>{loading ? 'Opening checkout…' : label}</span>
    </button>
  );
}

/* ---------- Client Component ---------- */
export default function CheckoutClient() {
  const router = useRouter();

  // 🔥 GARANTE que é só "pt" ou "en"
  const rawLocale = useLocale();
  const locale: 'pt' | 'en' = rawLocale === 'en' ? 'en' : 'pt';

  const [checkedShip, setCheckedShip] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await fetch('/api/checkout/shipping', {
          method: 'GET',
          cache: 'no-store',
        });

        const data = await r.json();

        if (!data?.shipping) {
          router.replace(`/${locale}/checkout/address`);
        } else if (alive) {
          setCheckedShip(true);
        }
      } catch {
        router.replace(`/${locale}/checkout/address`);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, locale]);

  if (!checkedShip) {
    return (
      <div className="rounded-2xl border bg-white p-5 text-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      <PayButton
        variant="primary"
        label="Pay with Card"
        loading={loading === 'card'}
        left={<IconCard />}
        onClick={async () => {
          try {
            setLoading('card');
            await startStripe('card', locale);
          } catch (e: any) {
            alert(e?.message || 'Stripe error');
          } finally {
            setLoading(null);
          }
        }}
      />

      <PayButton
        variant="paypal"
        label="Pay with PayPal"
        loading={loading === 'paypal'}
        left={<IconPayPal />}
        onClick={async () => {
          try {
            setLoading('paypal');
            await startPayPal();
          } catch (e: any) {
            alert(e?.message || 'PayPal error');
          } finally {
            setLoading(null);
          }
        }}
      />

      <PayButton
        label="Pay with Multibanco"
        loading={loading === 'multibanco'}
        onClick={async () => {
          try {
            setLoading('multibanco');
            await startStripe('multibanco', locale);
          } catch (e: any) {
            alert(e?.message || 'Multibanco error');
          } finally {
            setLoading(null);
          }
        }}
      />

      <PayButton
        label="See all payment methods"
        loading={loading === 'automatic'}
        onClick={async () => {
          try {
            setLoading('automatic');
            await startStripe('automatic', locale);
          } catch (e: any) {
            alert(e?.message || 'Stripe error');
          } finally {
            setLoading(null);
          }
        }}
      />
    </div>
  );
}