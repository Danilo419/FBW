'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  CalendarDays,
  Mail,
  ShieldCheck,
  Save,
  KeyRound,
  CheckCircle2,
  XCircle,
  User,
  Image as ImageIcon,
  UploadCloud,
  ReceiptText,
  ChevronRight,
  Loader2,
  Package,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

/* ========= Tipos das props ========= */
type Props = {
  userId?: string;
  email: string;
  defaultName: string;
  defaultImage?: string | null;
  createdAt: string;
  updatedAt: string;
  provider: string;
  fallbackImage: string;
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/* ========= Cloudinary helpers (upload direto) ========= */
async function getAvatarSignature() {
  const r = await fetch('/api/account/upload-signature', { method: 'POST' });
  if (!r.ok) throw new Error('Failed to get signature');
  return (await r.json()) as {
    timestamp: number;
    folder: string;
    signature: string;
    cloudName: string;
    apiKey: string;
  };
}
async function uploadAvatarToCloudinary(file: File) {
  const { timestamp, folder, signature, cloudName, apiKey } = await getAvatarSignature();
  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', apiKey);
  fd.append('timestamp', String(timestamp));
  fd.append('signature', signature);
  fd.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: fd,
  });
  const j = await res.json();
  if (!res.ok || !j?.secure_url) throw new Error(j?.error?.message || 'Upload failed');
  return j.secure_url as string;
}
function isValidImg(file: File) {
  const okType = /^image\/(jpe?g|png|webp|gif)$/i.test(file.type);
  const okSize = file.size <= 8 * 1024 * 1024; // 8MB
  return okType && okSize;
}

function fmtMoneyFromCents(cents: number, currency = 'eur') {
  const c = (currency || 'eur').toUpperCase();
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: c }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${c}`;
  }
}

/* ========= Componente principal ========= */
export default function AccountClient(props: Props) {
  const [tab, setTab] = useState<'overview' | 'profile' | 'security' | 'orders'>('overview');

  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-6">
      {/* Sidebar */}
      <aside className="card p-4 h-fit">
        <nav className="flex lg:flex-col gap-2">
          {(
            [
              ['overview', 'Overview'],
              ['profile', 'Profile'],
              ['security', 'Security'],
              ['orders', 'My Orders'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`text-left rounded-xl px-3 py-2 transition ${
                tab === key ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <section className="space-y-6">
        {tab === 'overview' && <Overview {...props} />}
        {tab === 'profile' && <ProfileForm {...props} />}
        {tab === 'security' && <SecurityForm />}
        {tab === 'orders' && <MyOrders />}
      </section>
    </div>
  );
}

/* ========= OVERVIEW ========= */
function Overview({ userId, email, defaultName, defaultImage, createdAt, provider }: Props) {
  const joined = useMemo(() => formatDate(createdAt), [createdAt]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
      <div className="flex items-center gap-4">
        <Avatar src={defaultImage ?? undefined} name={defaultName || email} size={80} />
        <div>
          <h2 className="text-xl font-semibold">{defaultName || 'Unnamed user'}</h2>
          <div className="text-gray-600 text-sm flex items-center gap-2 mt-1">
            <Mail className="h-4 w-4" /> {email}
          </div>
          <div className="text-gray-600 text-sm flex items-center gap-2 mt-1">
            <CalendarDays className="h-4 w-4" /> Joined {joined}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <InfoCard label="Account status">
          <div className="mt-1 font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-600" /> Active
          </div>
        </InfoCard>

        <InfoCard label="Provider">
          <div className="mt-1 font-semibold">{provider}</div>
        </InfoCard>

        <InfoCard label="User ID">
          <div className="mt-1 font-mono text-sm truncate">{userId ?? '—'}</div>
        </InfoCard>
      </div>
    </motion.div>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4 bg-white/70">
      <div className="text-xs text-gray-500">{label}</div>
      {children}
    </div>
  );
}

/* ========= MY ORDERS ========= */

type OrderListItem = {
  id: string;
  createdAt: string;
  status: string;
  currency: string;
  totalCents: number;
  itemsCount: number;
};

function MyOrders() {
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch('/api/account/orders', { method: 'GET' });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || 'Failed to load orders');
        if (!alive) return;
        setOrders(Array.isArray(j?.orders) ? j.orders : []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? 'Something went wrong');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (status !== 'loading') run();
    return () => {
      alive = false;
    };
  }, [status]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ReceiptText className="h-5 w-5" /> My Orders
          </h2>
          <p className="text-sm text-gray-600 mt-1">See your full purchase history.</p>
        </div>
      </div>

      <div className="mt-5">
        {loading && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
          </div>
        )}

        {!loading && err && (
          <div className="rounded-2xl border p-4 bg-red-50 text-red-700 text-sm">{err}</div>
        )}

        {!loading && !err && orders.length === 0 && (
          <div className="rounded-2xl border p-6 bg-white/70 text-center">
            <Package className="h-6 w-6 mx-auto text-gray-400" />
            <div className="mt-2 font-semibold">No orders yet</div>
            <div className="mt-1 text-sm text-gray-600">
              When you buy something, your orders will show up here.
            </div>
          </div>
        )}

        {!loading && !err && orders.length > 0 && (
          <div className="grid gap-3">
            {orders.map((o) => (
              <div
                key={o.id}
                className="rounded-2xl border p-4 bg-white/70 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{`Order #${o.id.slice(0, 8).toUpperCase()}`}</span>
                    <span className="text-xs px-2 py-1 rounded-full border bg-white">{o.status}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Placed: {formatDate(o.createdAt)}</span>
                    <span>Items: {o.itemsCount}</span>
                    <span>Total: {fmtMoneyFromCents(o.totalCents, o.currency)}</span>
                  </div>
                </div>

                <Link
                  href={`/account/orders/${encodeURIComponent(o.id)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 hover:bg-gray-50"
                >
                  See Details <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ========= PROFILE (upload direto ao Cloudinary) ========= */
function ProfileForm({ email, defaultName, defaultImage }: Props) {
  const { update } = useSession(); // ✅ para refrescar sessão no próprio separador
  const [name, setName] = useState(defaultName || '');
  const [image, setImage] = useState<string>(defaultImage || '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function uploadIfNeeded(): Promise<string | null> {
    if (!file) return null;
    if (!isValidImg(file)) throw new Error('Escolhe uma imagem JPG/PNG/WebP até 8 MB.');
    return await uploadAvatarToCloudinary(file);
  }

  const onSave = async () => {
    setLoading(true);
    setOk(null);
    setErr(null);
    try {
      let finalImage = image?.trim() || null;
      if (file) {
        const uploadedUrl = await uploadIfNeeded();
        finalImage = uploadedUrl ?? finalImage;
      }

      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image: finalImage }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update profile');

      setImage(data?.user?.image ?? finalImage ?? '');
      setFile(null);
      setOk('Profile updated successfully');

      try {
        localStorage.setItem('profile:updated', String(Date.now()));
        window.dispatchEvent(new Event('profile:updated'));
      } catch {}

      try {
        await update?.();
      } catch {}
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (!isValidImg(f)) {
      setErr('Escolhe uma imagem JPG/PNG/WebP até 8 MB.');
      setTimeout(() => setErr(null), 2500);
      return;
    }
    setFile(f);
    setImage(URL.createObjectURL(f));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
      <h2 className="text-xl font-semibold mb-4">Edit profile</h2>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <div className="flex flex-col items-center gap-3">
          <Avatar src={image || undefined} name={name || email} size={96} />
          <UploadFromDevice onPick={onFileChange} />
          <div className="text-xs text-gray-500 text-center">JPG/PNG/WebP até 8MB.</div>
        </div>

        <div className="grid gap-4">
          <label className="block">
            <span className="text-sm text-gray-700">Name</span>
            <div className="mt-1 flex items-center gap-2 rounded-2xl border px-3">
              <User className="h-4 w-4 text-gray-400" />
              <input
                className="w-full py-2 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm text-gray-700">Image URL</span>
            <div className="mt-1 flex items-center gap-2 rounded-2xl border px-3">
              <ImageIcon className="h-4 w-4 text-gray-400" />
              <input
                className="w-full py-2 outline-none"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://… (ou será preenchido após upload)"
              />
            </div>
          </label>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={onSave} disabled={loading} className="btn-primary disabled:opacity-60">
          <Save className="h-4 w-4" /> Save changes
        </button>

        {ok && <BadgeOk>{ok}</BadgeOk>}
        {err && <BadgeErr>{err}</BadgeErr>}
      </div>
    </motion.div>
  );
}

function UploadFromDevice({ onPick }: { onPick: (f: File | null) => void }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 cursor-pointer hover:bg-gray-50">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <UploadCloud className="h-4 w-4" />
      <span>Upload from device</span>
    </label>
  );
}

/* ========= SECURITY ========= */
function SecurityForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onChangePassword = async () => {
    setLoading(true);
    setOk(null);
    setErr(null);
    try {
      if (newPassword.length < 8) throw new Error('New password must be at least 8 characters');
      if (newPassword !== confirm) throw new Error('Passwords do not match');

      const res = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to change password');

      setOk('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
      <h2 className="text-xl font-semibold mb-4">Security</h2>

      <div className="grid gap-4">
        <PasswordInput label="Current password" value={currentPassword} onChange={setCurrentPassword} />
        <PasswordInput label="New password" value={newPassword} onChange={setNewPassword} />
        <PasswordInput label="Confirm new password" value={confirm} onChange={setConfirm} />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={onChangePassword} disabled={loading} className="btn-primary disabled:opacity-60">
          <KeyRound className="h-4 w-4" /> Change password
        </button>

        {ok && <BadgeOk>{ok}</BadgeOk>}
        {err && <BadgeErr>{err}</BadgeErr>}
      </div>
    </motion.div>
  );
}

function PasswordInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-2xl border px-3">
        <KeyRound className="h-4 w-4 text-gray-400" />
        <input
          type="password"
          className="w-full py-2 outline-none"
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}

/* ========= UI helpers ========= */
function BadgeOk({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-green-700 text-sm">
      <CheckCircle2 className="h-4 w-4" /> {children}
    </span>
  );
}
function BadgeErr({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-red-600 text-sm">
      <XCircle className="h-4 w-4" /> {children}
    </span>
  );
}

/* ========= Avatar ========= */
function Avatar({ src, name, size = 64 }: { src?: string | null; name?: string; size?: number }) {
  const initials = (name || 'User')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name || 'Avatar'}
      className="rounded-full object-cover border"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-white border flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label="avatar"
      title={name}
    >
      <span className="font-semibold" style={{ fontSize: Math.max(12, size / 3.2) }}>
        {initials}
      </span>
    </div>
  );
}
