// src/app/(store)/checkout/CheckoutClient.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

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
async function startStripe(method: StripeMethod) {
  const res = await fetch('/api/checkout/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Address was already collected in /checkout/address and stored (cookie/session)
    body: JSON.stringify({ method }),
  });
  const data = await res.json();
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

/* ---------- Icons (minimal, inline) ---------- */
const IconCard = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" fill="#111" />
    <rect x="4" y="9" width="16" height="2" fill="#fff" />
    <rect x="4" y="13" width="8" height="2" fill="#ccc" />
  </svg>
);

const IconPayPal = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
    <path
      fill="#003087"
      d="M23.5 9.3c-.3-2.1-2.2-3.3-4.8-3.3H11l-2.5 17h3.7l.7-5h3.5c4.1 0 7.4-1.7 7.8-5.2.1-.5.1-1 0-1.5z"
    />
    <path
      fill="#009cde"
      d="M25.9 10.8c-.5 3.5-3.7 5.2-7.8 5.2h-3.5l-1 7h3.1l.6-4h2.4c3.1 0 5.6-1.1 6.3-4.4.2-1 .2-2 0-2.8z"
    />
  </svg>
);

const IconMultibanco = () => (
  <svg width="24" height="24" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#0B1E3B" />
    <text
      x="12"
      y="15.5"
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

const IconRevolut = () => (
  <svg width="24" height="24" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#00E1A1" />
    <text
      x="12"
      y="16"
      textAnchor="middle"
      fontFamily="Arial, sans-serif"
      fontSize="12"
      fill="#001B2E"
      fontWeight="900"
    >
      R
    </text>
  </svg>
);

const IconKlarna = () => (
  <svg width="24" height="24" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#FFB3C7" />
    <text
      x="12"
      y="16"
      textAnchor="middle"
      fontFamily="Arial, sans-serif"
      fontSize="12"
      fill="#111"
      fontWeight="900"
    >
      K
    </text>
  </svg>
);

const IconSatispay = () => (
  <svg width="24" height="24" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#FF3D2E" />
    <path
      d="M8 7l4 5-4 5M16 7l-4 5 4 5"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const IconAmazonPay = () => (
  <svg width="24" height="24" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#232F3E" />
    <path
      d="M6 15c3.6 2.4 8.4 2.4 12 0"
      stroke="#FF9900"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const IconLink = () => (
  <svg width="24" height="24" aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#00E599" />
    <path d="M9.8 6.8c1.8 1.7 3.3 3.2 4.8 4.7-1.5 1.5-3 3-4.8 4.7h3.1l4.4-4.7-4.4-4.7H9.8z" fill="#072017" />
  </svg>
);

const IconMore = () => (
  <svg width="24" height="24" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#EEF2FF" />
    <circle cx="9" cy="12" r="1.6" fill="#111" />
    <circle cx="12" cy="12" r="1.6" fill="#111" />
    <circle cx="15" cy="12" r="1.6" fill="#111" />
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
  const [checkedShip, setCheckedShip] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  // Guard: if there is no shipping cookie/session, force user to address step
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/checkout/shipping', { method: 'GET', cache: 'no-store' });
        const data = await r.json();
        if (alive) {
          if (!data?.shipping) {
            router.replace('/checkout/address');
          } else {
            setCheckedShip(true);
          }
        }
      } catch {
        router.replace('/checkout/address');
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  if (!checkedShip) {
    return (
      <div className="rounded-2xl border bg-white p-5 text-center">Loading…</div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      {/* 1) Card */}
      <PayButton
        variant="primary"
        label="Pay with Card"
        loading={loading === 'card'}
        left={<IconCard />}
        onClick={async () => {
          try {
            setLoading('card');
            await startStripe('card');
          } catch (e: any) {
            alert(e?.message || 'Stripe error');
          } finally {
            setLoading(null);
          }
        }}
      />

      {/* 2) PayPal */}
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

      {/* 3) Amazon Pay — below PayPal */}
      <PayButton
        label="Pay with Amazon Pay"
        loading={loading === 'amazon_pay'}
        left={<IconAmazonPay />}
        onClick={async () => {
          try {
            setLoading('amazon_pay');
            await startStripe('amazon_pay');
          } catch (e: any) {
            alert(e?.message || 'Amazon Pay error');
          } finally {
            setLoading(null);
          }
        }}
      />

      {/* 4) Multibanco — below Amazon Pay */}
      <PayButton
        label="Pay with Multibanco"
        loading={loading === 'multibanco'}
        left={<IconMultibanco />}
        onClick={async () => {
          try {
            setLoading('multibanco');
            await startStripe('multibanco');
          } catch (e: any) {
            alert(e?.message || 'Multibanco error');
          } finally {
            setLoading(null);
          }
        }}
      />

      {/* 5) Revolut Pay */}
      <PayButton
        label="Pay with Revolut Pay"
        loading={loading === 'revolut_pay'}
        left={<IconRevolut />}
        onClick={async () => {
          try {
            setLoading('revolut_pay');
            await startStripe('revolut_pay');
          } catch (e: any) {
            alert(e?.message || 'Revolut Pay error');
          } finally {
            setLoading(null);
          }
        }}
      />

      {/* 6) Klarna */}
      <PayButton
        label="Pay with Klarna"
        loading={loading === 'klarna'}
        left={<IconKlarna />}
        onClick={async () => {
          try {
            setLoading('klarna');
            await startStripe('klarna');
          } catch (e: any) {
            alert(e?.message || 'Klarna error');
          } finally {
            setLoading(null);
          }
        }}
      />

      {/* 7) Satispay */}
      <PayButton
        label="Pay with Satispay"
        loading={loading === 'satispay'}
        left={<IconSatispay />}
        onClick={async () => {
          try {
            setLoading('satispay');
            await startStripe('satispay');
          } catch (e: any) {
            alert(e?.message || 'Satispay error');
          } finally {
            setLoading(null);
          }
        }}
      />

      {/* 8) Link (Stripe Link – optional) */}
      <PayButton
        label="Pay with Link"
        loading={loading === 'link'}
        left={<IconLink />}
        onClick={async () => {
          try {
            setLoading('link');
            await startStripe('link');
          } catch (e: any) {
            alert(e?.message || 'Link error');
          } finally {
            setLoading(null);
          }
        }}
      />

      {/* 9) More options (Stripe automatic_payment_methods) */}
      <PayButton
        label="See all payment methods"
        loading={loading === 'automatic'}
        left={<IconMore />}
        onClick={async () => {
          try {
            setLoading('automatic');
            await startStripe('automatic');
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
