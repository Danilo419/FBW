// src/app/contact/ContactClient.tsx
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Loader2,
  User,
  AtSign,
  Hash,
  Type,
  MessageSquareText,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Truck,
  RotateCcw,
  Mail,
  ShieldCheck,
  Sparkles,
  Ruler,
  ChevronRight,
} from "lucide-react";

const SUBJECT_MAX = 120;
const MESSAGE_MAX = 1200;
const TEXTAREA_MAX_H = 520;

export default function ContactClient() {
  const searchParams = useSearchParams();

  // Prefill from query params (?subject=&email=&order=&name=)
  const initial = useMemo(
    () => ({
      name: searchParams.get("name") || "",
      email: searchParams.get("email") || "",
      subject: searchParams.get("subject") || "",
      order: searchParams.get("order") || "",
    }),
    [searchParams]
  );

  const [pending, setPending] = useState(false);
  const [ok, setOk] = useState<null | "ok" | "err">(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: initial.name,
    email: initial.email,
    subject: initial.subject,
    message: "",
    order: initial.order,
  });

  // Keep prefilled values in sync if URL changes
  useEffect(() => {
    setForm((s) => ({
      ...s,
      name: s.name || initial.name,
      email: s.email || initial.email,
      subject: s.subject || initial.subject,
      order: s.order || initial.order,
    }));
  }, [initial.name, initial.email, initial.subject, initial.order]);

  // Preset chips (all with an icon)
  const chips: { label: string; icon: ReactNode }[] = [
    { label: "Tracking help", icon: <Truck className="h-3.5 w-3.5" /> },
    { label: "Start a return", icon: <RotateCcw className="h-3.5 w-3.5" /> },
    { label: "Order status / tracking", icon: <Truck className="h-3.5 w-3.5" /> },
    { label: "Change size or address", icon: <Ruler className="h-3.5 w-3.5" /> },
    { label: "Return / exchange", icon: <RotateCcw className="h-3.5 w-3.5" /> },
    { label: "Product question", icon: <HelpCircle className="h-3.5 w-3.5" /> },
  ];

  // Autosize textarea
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, TEXTAREA_MAX_H) + "px";
  }, [form.message]);

  // Auto-clear toast
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(null), 3000);
    return () => clearTimeout(t);
  }, [ok]);

  const msgPct = Math.min(
    100,
    Math.round((form.message.length / MESSAGE_MAX) * 100)
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;

    setPending(true);
    setOk(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("No endpoint");
      setOk("ok");
      setForm({ name: "", email: "", subject: "", message: "", order: "" });
    } catch {
      // Fallback to mailto if API is not available
      openMailApp();
      setOk("ok");
    } finally {
      setPending(false);
    }
  }

  function openMailApp() {
    const to = "myfootballworldshop@gmail.com";
    const subject = encodeURIComponent(
      form.subject || `Support request from ${form.name || "customer"}`
    );
    const body = encodeURIComponent(
      [
        `Name: ${form.name}`,
        `Email: ${form.email}`,
        form.order ? `Order: ${form.order}` : "",
        "",
        form.message,
      ]
        .filter(Boolean)
        .join("\n")
    );
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }

  function usePreset(v: string) {
    setForm((s) => ({ ...s, subject: v.slice(0, SUBJECT_MAX) }));
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText("myfootballworldshop@gmail.com");
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  }

  return (
    <div className="container-fw mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 lg:py-10 relative">
      {/* Decorative glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full blur-3xl bg-cyan-200/40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-8 h-64 w-64 rounded-full blur-3xl bg-blue-200/30"
      />

      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-5 py-6 sm:px-7 sm:py-7 lg:px-9 lg:py-8 shadow-sm">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border bg-white/80 px-2.5 py-1">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              We’re here to help
            </span>
          </div>
          <h1 className="mt-4 bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-[1.9rem] md:text-[2.2rem] lg:text-[2.4rem] font-extrabold leading-tight tracking-tight text-transparent">
            Contact FootballWorld Support
          </h1>
          <p className="mt-2 text-sm md:text-[15px] text-gray-600 leading-relaxed">
            We answer most messages within <b>24–48h</b>. Include your order
            number for the fastest help.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Badge icon={<ShieldCheck className="h-3.5 w-3.5 text-green-600" />}>
              Secure & private
            </Badge>
            <Badge icon={<Clock className="h-3.5 w-3.5 text-amber-600" />}>
              24–48h reply
            </Badge>
            <Badge icon={<Truck className="h-3.5 w-3.5 text-blue-600" />}>
              Global shipping
            </Badge>
          </div>
        </div>
      </div>

      {/* Toast */}
      {ok && (
        <div
          role="status"
          className={`mb-6 rounded-xl border px-4 py-3 text-sm shadow-sm ${
            ok === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {ok === "ok" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span>
              {ok === "ok"
                ? "Thanks! Your message was sent — we’ll reply by email."
                : "Something went wrong. Please try again or email us directly."}
            </span>
          </div>
        </div>
      )}

      {/* Grid: form + sidebar */}
      <div className="grid gap-7 lg:grid-cols-2 items-start">
        {/* Form */}
        <div className="rounded-2xl border bg-white/95 backdrop-blur px-4 py-5 sm:px-5 sm:py-6 md:px-6 md:py-7 shadow-sm">
          <form onSubmit={onSubmit} noValidate className="grid gap-5">
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <PresetChip
                  key={c.label}
                  icon={c.icon}
                  label={c.label}
                  onClick={() => usePreset(c.label)}
                />
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                icon={<User className="h-4 w-4" />}
                label="Your name"
                placeholder="e.g. John Doe"
                value={form.name}
                onChange={(v) => setForm((s) => ({ ...s, name: v }))}
                name="name"
                autoComplete="name"
                required
              />
              <Field
                type="email"
                icon={<AtSign className="h-4 w-4" />}
                label="Email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(v) => setForm((s) => ({ ...s, email: v }))}
                name="email"
                autoComplete="email"
                required
                hint={
                  <span className="text-[11px] text-gray-500">
                    We never share it
                  </span>
                }
              />
            </div>

            <Field
              icon={<Hash className="h-4 w-4" />}
              label="Order number (optional)"
              placeholder="e.g. #FW12345"
              value={form.order}
              onChange={(v) => setForm((s) => ({ ...s, order: v }))}
              name="order"
              autoComplete="off"
            />

            <Field
              icon={<Type className="h-4 w-4" />}
              label="Subject"
              placeholder="How can we help?"
              value={form.subject}
              onChange={(v) =>
                setForm((s) => ({ ...s, subject: v.slice(0, SUBJECT_MAX) }))
              }
              name="subject"
              autoComplete="off"
              required
              hint={
                <span className="text-[11px] text-gray-500">
                  {form.subject.length}/{SUBJECT_MAX}
                </span>
              }
            />

            {/* Message */}
            <div className="group rounded-xl border bg-white/95 shadow-sm transition focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              <label className="flex items-center gap-2 border-b px-4 py-2.5 text-[12px] text-gray-600">
                <span className="rounded-md bg-blue-50 p-1.5 text-blue-600">
                  <MessageSquareText className="h-4 w-4" />
                </span>
                Message
                <span className="ml-auto text-gray-400">
                  <span className="text-[11px]">
                    {form.message.length}/{MESSAGE_MAX}
                  </span>
                </span>
              </label>
              <textarea
                ref={textRef}
                className="w-full resize-none rounded-xl rounded-t-none border-0 px-4 py-3.5 outline-none text-[15px]"
                placeholder="Write your message here…"
                value={form.message}
                maxLength={MESSAGE_MAX}
                onChange={(e) =>
                  setForm((s) => ({ ...s, message: e.target.value }))
                }
                name="message"
                required
              />
              {/* progress bar */}
              <div className="px-4 pb-3.5">
                <div className="h-1 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-[width]"
                    style={{ width: `${msgPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="group inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-[15px] font-medium text-white shadow-md transition
                           bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 disabled:opacity-60"
                aria-busy={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    Send message
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={openMailApp}
                className="inline-flex items-center gap-2 rounded-full border px-5 py-3.5 text-[15px] hover:bg-gray-50"
              >
                <Mail className="h-4 w-4" />
                Open email app
              </button>

              <p className="text-xs text-gray-500">
                You’ll also receive a copy of your message.
              </p>
            </div>
          </form>

          {/* “What happens next?” */}
          <div className="mt-6 relative overflow-hidden rounded-2xl border shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400" />
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-teal-50" />
            <div className="relative px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold">What happens next?</h3>
              </div>

              <div className="relative mt-4">
                <div className="hidden sm:block absolute left-14 right-14 top-7 h-0.5 bg-gradient-to-r from-blue-200 via-cyan-200 to-emerald-200" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Step
                    num={1}
                    icon={<Mail className="h-5 w-5" />}
                    title="Copy by email"
                    text="We’ll send a confirmation of your message to your inbox."
                    color="from-blue-600 to-cyan-500"
                  />
                  <Step
                    num={2}
                    icon={<Clock className="h-5 w-5" />}
                    title="24–48h reply"
                    text="Our team answers on business days as quickly as possible."
                    color="from-amber-600 to-orange-500"
                  />
                  <Step
                    num={3}
                    icon={<RotateCcw className="h-5 w-5" />}
                    title="Photos help"
                    text="For defects or exchanges, send clear photos when we reply."
                    color="from-emerald-600 to-green-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:space-y-5">
          <div className="rounded-2xl border bg-white/95 px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <h3 className="font-semibold">Quick help</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/shipping-tracking"
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 hover:bg-gray-50 w-full"
                >
                  <Truck className="h-4 w-4 text-blue-600" />
                  Shipping & Tracking
                </Link>
              </li>
              <li>
                <Link
                  href="/returns"
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 hover:bg-gray-50 w-full"
                >
                  <RotateCcw className="h-4 w-4 text-amber-600" />
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 hover:bg-gray-50 w-full"
                >
                  <HelpCircle className="h-4 w-4 text-purple-600" />
                  FAQ
                </Link>
              </li>
            </ul>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <InfoStat icon={<Clock className="h-3.5 w-3.5" />} label="Avg reply">
                24–48h
              </InfoStat>
              <InfoStat icon={<Mail className="h-3.5 w-3.5" />} label="Hours">
                Mon–Fri
              </InfoStat>
            </div>
          </div>

          <div className="rounded-2xl border bg-gradient-to-br from-white to-sky-50 px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
            <h3 className="font-semibold">Prefer email?</h3>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
              You can email us directly — we’ll reply from our support inbox.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded-xl border bg-white px-3 py-2 text-sm">
                myfootballworldshop@gmail.com
              </code>
              <button
                type="button"
                onClick={copyEmail}
                className="rounded-full border px-3 py-2 text-sm hover:bg-white"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Useful links */}
          <div className="rounded-2xl border bg-white/95 px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold">Useful links</h3>
            </div>

            <div className="mt-3 grid gap-2">
              <Link
                href="/privacy-policy"
                className="group flex items-center justify-between rounded-xl border bg-gradient-to-r from-white to-emerald-50/40 p-3.5 hover:from-emerald-50 hover:to-white transition"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-medium leading-tight">Privacy Policy</div>
                    <p className="text-xs text-gray-500">How we protect your data</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 transition group-hover:translate-x-0.5" />
              </Link>

              <Link
                href="/size-guide"
                className="group flex items-center justify-between rounded-xl border bg-gradient-to-r from-white to-indigo-50/40 p-3.5 hover:from-indigo-50 hover:to-white transition"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border bg-indigo-50 text-indigo-600">
                    <Ruler className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-medium leading-tight">Size Guide</div>
                    <p className="text-xs text-gray-500">Find your perfect fit</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* — UI bits — */
function Badge({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-white/80 px-2.5 py-1">
      {icon}
      {children}
    </span>
  );
}

function PresetChip({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs hover:bg-gray-50"
      aria-label={`Use subject: ${label}`}
    >
      <span className="text-gray-600">{icon}</span>
      <span className="font-medium text-gray-800">{label}</span>
    </button>
  );
}

function InfoStat({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-medium text-gray-900 text-sm">{children}</div>
    </div>
  );
}

function Step({
  num,
  icon,
  title,
  text,
  color = "from-blue-600 to-cyan-500",
}: {
  num: number;
  icon: ReactNode;
  title: string;
  text: string;
  color?: string;
}) {
  return (
    <div className="relative rounded-xl border bg-white/75 p-4 sm:p-4.5 hover:shadow-md transition flex flex-col h-full">
      <div className="flex items-start gap-3">
        <span
          className={`relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${color} text-white shadow-sm`}
        >
          {icon}
          <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full border bg-white text-[11px] font-bold text-blue-600">
            {num}
          </span>
        </span>
        <div>
          <div className="font-semibold leading-tight mb-0.5">{title}</div>
          <p className="text-xs text-gray-600 leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  hint,
  name,
  autoComplete,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  name?: string;
  autoComplete?: string;
}) {
  return (
    <div className="group rounded-xl border bg-white/95 shadow-sm transition focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <label className="flex items-center gap-2 border-b px-4 py-2.5 text-[12px] text-gray-600">
        <span className="rounded-md bg-blue-50 p-1.5 text-blue-600">{icon}</span>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        <span className="ml-auto">{hint}</span>
      </label>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        name={name}
        autoComplete={autoComplete}
        className="w-full rounded-xl rounded-t-none border-0 px-4 py-3.5 outline-none text-[15px]"
      />
    </div>
  );
}
