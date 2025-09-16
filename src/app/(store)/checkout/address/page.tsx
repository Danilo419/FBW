// src/app/(store)/checkout/address/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function AddressPage() {
  const router = useRouter();
  const [ship, setShip] = useState<Shipping>({
    name: '',
    email: '',
    phone: '',
    address: { line1: '', line2: '', city: '', state: '', postal_code: '', country: '' },
  });
  const [loading, setLoading] = useState(false);

  function up<K extends keyof Shipping>(k: K, v: Shipping[K]) {
    setShip((s) => ({ ...s, [k]: v }));
  }
  function upAddr<K extends keyof NonNullable<Shipping['address']>>(k: K, v: string) {
    setShip((s) => ({ ...s, address: { ...(s.address || {}), [k]: v } }));
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
      if (!res.ok) throw new Error(data.error || 'Failed to save address');
      router.push('/checkout'); // Passo 2: métodos de pagamento
    } catch (err: any) {
      alert(err?.message || 'Error saving address');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-extrabold mb-6 text-center">Shipping address</h1>

      <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className="rounded-xl border px-4 py-3" placeholder="Full name" required
            value={ship.name || ''} onChange={(e) => up('name', e.target.value)} />
          <input className="rounded-xl border px-4 py-3" placeholder="Phone (optional)"
            value={ship.phone || ''} onChange={(e) => up('phone', e.target.value)} />
          <input className="rounded-xl border px-4 py-3 sm:col-span-2" placeholder="Email (optional)" type="email"
            value={ship.email || ''} onChange={(e) => up('email', e.target.value)} />
          <input className="rounded-xl border px-4 py-3 sm:col-span-2" placeholder="Address line 1" required
            value={ship.address?.line1 || ''} onChange={(e) => upAddr('line1', e.target.value)} />
          <input className="rounded-xl border px-4 py-3 sm:col-span-2" placeholder="Address line 2 (optional)"
            value={ship.address?.line2 || ''} onChange={(e) => upAddr('line2', e.target.value)} />
          <input className="rounded-xl border px-4 py-3" placeholder="City" required
            value={ship.address?.city || ''} onChange={(e) => upAddr('city', e.target.value)} />
          <input className="rounded-xl border px-4 py-3" placeholder="Region / State (optional)"
            value={ship.address?.state || ''} onChange={(e) => upAddr('state', e.target.value)} />
          <input className="rounded-xl border px-4 py-3" placeholder="Postal code" required
            value={ship.address?.postal_code || ''} onChange={(e) => upAddr('postal_code', e.target.value)} />
          <input className="rounded-xl border px-4 py-3" placeholder="Country" required
            value={ship.address?.country || ''} onChange={(e) => upAddr('country', e.target.value)} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl border px-5 py-3 font-semibold hover:bg-gray-50 disabled:opacity-60"
        >
          {loading ? 'Saving…' : 'Enter'}
        </button>
      </form>
    </main>
  );
}
