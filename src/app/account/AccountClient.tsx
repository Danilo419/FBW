'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';

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

/* ========= Componente principal ========= */
export default function AccountClient(props: Props) {
  const [tab, setTab] = useState<'overview' | 'profile' | 'security'>('overview');

  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-6">
      {/* Sidebar */}
      <aside className="card p-4 h-fit">
        <nav className="flex lg:flex-col gap-2">
          {(['overview','profile','security'] as const).map(key => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`text-left rounded-xl px-3 py-2 transition ${
                tab === key ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
              }`}
            >
              {key[0].toUpperCase() + key.slice(1)}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <section className="space-y-6">
        {tab === 'overview' && <Overview {...props} />}
        {tab === 'profile' && <ProfileForm {...props} />}
        {tab === 'security' && <SecurityForm />}
      </section>
    </div>
  );
}

/* ========= OVERVIEW ========= */
function Overview({
  userId,
  email,
  defaultName,
  defaultImage,
  createdAt,
  provider,
}: Props) {
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

/* ========= PROFILE (upload via /api/upload) ========= */
function ProfileForm({ email, defaultName, defaultImage }: Props) {
  const [name, setName] = useState(defaultName || '');
  const [image, setImage] = useState<string>(defaultImage || '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function uploadIfNeeded(): Promise<string | null> {
    if (!file) return null;

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Upload failed");

    return data.url as string;
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

      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image: finalImage }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update profile");

      setImage(data?.user?.image ?? finalImage ?? "");
      setFile(null);
      setOk("Profile updated successfully");
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (f: File | null) => {
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setImage(url);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
      <h2 className="text-xl font-semibold mb-4">Edit profile</h2>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <div className="flex flex-col items-center gap-3">
          <Avatar src={image || undefined} name={name || email} size={96} />
          <UploadFromDevice onPick={onFileChange} />
          <div className="text-xs text-gray-500 text-center">
            JPG/PNG até 8MB. A imagem será comprimida.
          </div>
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
                placeholder="https://… or /uploads/..."
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
    setLoading(true); setOk(null); setErr(null);
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
      setCurrentPassword(''); setNewPassword(''); setConfirm('');
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
      <h2 className="text-xl font-semibold mb-4">Security</h2>

      {/* ──> UMA COLUNA (cada campo numa linha) */}
      <div className="grid gap-4">
        <PasswordInput
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <PasswordInput
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <PasswordInput
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
        />
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

function PasswordInput(
  { label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }
) {
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
