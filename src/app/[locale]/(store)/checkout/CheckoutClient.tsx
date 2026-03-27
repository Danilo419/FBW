// src/app/[locale]/(store)/checkout/CheckoutClient.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

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

/* ---------- Icons ---------- */
const IconCard = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" fill="#111" />
    <rect x="4" y="9" width="16" height="2" fill="#fff" />
    <rect x="4" y="13" width="8" height="2" fill="#ccc" />
  </svg>
);

const IconPayPal = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
    <path fill="#003087" d="M23.5 9.3c-.3-2.1-2.2-3.3-4.8-3.3H11l-2.5 17h3.7l.7-5h3.5c4.1 0 7.4-1.7 7.8-5.2.1-.5.1-1 0-1.5z" />
    <path fill="#009cde" d="M25.9 10.8c-.5 3.5-3.7 5.2-7.8 5.2h-3.5l-1 7h3.1l.6-4h2.4c3.1 0 5.6-1.1 6.3-4.4.2-1 .2-2 0-2.8z" />
  </svg>
);

const IconMultibanco = () => (
  <div className="flex h-6 w-6 items-center justify-center rounded bg-[#0B1E3B] text-xs font-bold text-white">
    MB
  </div>
);

const IconRevolut = () => (
  <div className="flex h-6 w-6 items-center justify-center rounded bg-[#00E1A1] font-bold">
    R
  </div>
);

const IconKlarna = () => (
  <div className="flex h-6 w-6 items-center justify-center rounded bg-pink-300 font-bold">
    K
  </div>
);

const IconSatispay = () => (
  <div className="flex h-6 w-6 items-center justify-center rounded bg-red-500 text-white">
    ⇄
  </div>
);

const IconAmazonPay = () => (
  <div className="flex h-6 w-6 items-center justify-center rounded bg-[#232F3E] text-orange-400">
    A
  </div>
);

const IconLink = () => (
  <div className="flex h-6 w-6 items-center justify-center rounded bg-green-400">
    →
  </div>
);

const IconMore = () => (
  <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-200">
    ⋯
  </div>
);

/* ---------- Button ---------- */
function PayButton({
  label,
  onClick,
  loading,
  variant = 'outline',
  left,
  loadingLabel,
}: {
  label: string;
  onClick: () => Promise<void> | void;
  loading: boolean;
  variant?: 'primary' | 'paypal' | 'outline';
  left?: ReactNode;
  loadingLabel: string;
}) {
  const base =
    'flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-3 font-semibold disabled:opacity-60';

  const styles =
    variant === 'primary'
      ? 'bg-black text-white'
      : variant === 'paypal'
        ? 'bg-yellow-400 text-black'
        : 'border';

  return (
    <button
      type="button"
      className={`${base} ${styles}`}
      onClick={onClick}
      disabled={loading}
    >
      {left}
      <span>{loading ? loadingLabel : label}</span>
    </button>
  );
}

/* ---------- Client ---------- */
export default function CheckoutClient() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('checkoutPage');

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

        if (!alive) return;

        if (!data?.shipping) {
          router.replace(`/${locale}/checkout/address`);
        } else {
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

  async function handleStripe(method: StripeMethod, loadingKey: string) {
    setLoading(loadingKey);
    try {
      await startStripe(method, locale);
    } catch (e: any) {
      alert(e?.message || t('error'));
    } finally {
      setLoading(null);
    }
  }

  async function handlePayPal() {
    setLoading('paypal');
    try {
      await startPayPal();
    } catch (e: any) {
      alert(e?.message || t('error'));
    } finally {
      setLoading(null);
    }
  }

  if (!checkedShip) {
    return (
      <div className="rounded-2xl border bg-white p-5 text-center">
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-5">
      <PayButton
        variant="primary"
        label={t('payWithCard')}
        loading={loading === 'card'}
        loadingLabel={t('openingCheckout')}
        left={<IconCard />}
        onClick={() => handleStripe('card', 'card')}
      />

      <PayButton
        variant="paypal"
        label={t('payWithPaypal')}
        loading={loading === 'paypal'}
        loadingLabel={t('openingCheckout')}
        left={<IconPayPal />}
        onClick={handlePayPal}
      />

      <PayButton
        label={t('payWithAmazon')}
        loading={loading === 'amazon_pay'}
        loadingLabel={t('openingCheckout')}
        left={<IconAmazonPay />}
        onClick={() => handleStripe('amazon_pay', 'amazon_pay')}
      />

      <PayButton
        label={t('payWithMultibanco')}
        loading={loading === 'multibanco'}
        loadingLabel={t('openingCheckout')}
        left={<IconMultibanco />}
        onClick={() => handleStripe('multibanco', 'multibanco')}
      />

      <PayButton
        label={t('payWithRevolut')}
        loading={loading === 'revolut_pay'}
        loadingLabel={t('openingCheckout')}
        left={<IconRevolut />}
        onClick={() => handleStripe('revolut_pay', 'revolut_pay')}
      />

      <PayButton
        label={t('payWithKlarna')}
        loading={loading === 'klarna'}
        loadingLabel={t('openingCheckout')}
        left={<IconKlarna />}
        onClick={() => handleStripe('klarna', 'klarna')}
      />

      <PayButton
        label={t('payWithSatispay')}
        loading={loading === 'satispay'}
        loadingLabel={t('openingCheckout')}
        left={<IconSatispay />}
        onClick={() => handleStripe('satispay', 'satispay')}
      />

      <PayButton
        label={t('payWithLink')}
        loading={loading === 'link'}
        loadingLabel={t('openingCheckout')}
        left={<IconLink />}
        onClick={() => handleStripe('link', 'link')}
      />

      <PayButton
        label={t('seeAll')}
        loading={loading === 'automatic'}
        loadingLabel={t('openingCheckout')}
        left={<IconMore />}
        onClick={() => handleStripe('automatic', 'automatic')}
      />
    </div>
  );
}