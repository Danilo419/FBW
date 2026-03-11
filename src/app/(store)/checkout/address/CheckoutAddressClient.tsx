// src/app/(store)/checkout/address/CheckoutAddressClient.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import CountrySelect from '@/components/checkout/CountrySelect';

type Shipping = {
  name?: string;
  phone?: string;
  email?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
};

type Address = NonNullable<Shipping['address']>;
type AddressKey = keyof Address;

export default function CheckoutAddressClient() {
  const t = useTranslations('checkoutAddressPage');
  const router = useRouter();

  const [ship, setShip] = useState<Shipping>({
    name: '',
    email: '',
    phone: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
    },
  });

  const [loading, setLoading] = useState(false);

  function up<K extends keyof Shipping>(k: K, v: Shipping[K]) {
    setShip((s) => ({ ...s, [k]: v }));
  }

  function upAddr(k: AddressKey, v: string) {
    setShip((s) => ({
      ...s,
      address: { ...(s.address ?? {}), [k]: v },
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/checkout/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipping: ship }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('errors.saveFailed'));
      }

      router.push('/checkout');
    } catch (err: any) {
      alert(err?.message || t('errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-white p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          className="rounded-xl border px-4 py-3"
          placeholder={t('fields.fullName')}
          required
          value={ship.name || ''}
          onChange={(e) => up('name', e.target.value)}
        />

        <input
          className="rounded-xl border px-4 py-3"
          placeholder={t('fields.phone')}
          value={ship.phone || ''}
          onChange={(e) => up('phone', e.target.value)}
        />

        <input
          className="rounded-xl border px-4 py-3 sm:col-span-2"
          placeholder={t('fields.email')}
          type="email"
          value={ship.email || ''}
          onChange={(e) => up('email', e.target.value)}
        />

        <input
          className="rounded-xl border px-4 py-3 sm:col-span-2"
          placeholder={t('fields.line1')}
          required
          value={ship.address?.line1 || ''}
          onChange={(e) => upAddr('line1', e.target.value)}
        />

        <input
          className="rounded-xl border px-4 py-3 sm:col-span-2"
          placeholder={t('fields.line2')}
          value={ship.address?.line2 || ''}
          onChange={(e) => upAddr('line2', e.target.value)}
        />

        <input
          className="rounded-xl border px-4 py-3"
          placeholder={t('fields.city')}
          required
          value={ship.address?.city || ''}
          onChange={(e) => upAddr('city', e.target.value)}
        />

        <input
          className="rounded-xl border px-4 py-3"
          placeholder={t('fields.state')}
          value={ship.address?.state || ''}
          onChange={(e) => upAddr('state', e.target.value)}
        />

        <input
          className="rounded-xl border px-4 py-3"
          placeholder={t('fields.postalCode')}
          required
          value={ship.address?.postal_code || ''}
          onChange={(e) => upAddr('postal_code', e.target.value)}
        />

        <div>
          <CountrySelect
            name="country"
            required
            value={ship.address?.country || ''}
            onChange={(v) => upAddr('country', v)}
            placeholder={t('fields.country')}
            className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl border px-5 py-3 font-semibold hover:bg-gray-50 disabled:opacity-60"
      >
        {loading ? t('actions.saving') : t('actions.continue')}
      </button>
    </form>
  );
}