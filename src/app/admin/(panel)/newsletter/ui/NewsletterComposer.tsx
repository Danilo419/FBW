"use client";

import { useMemo, useState, useTransition } from "react";
import { sendNewsletterEmailAction } from "../actions";

type StyleMode = "simple" | "pretty";

export default function NewsletterComposer() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [style, setStyle] = useState<StyleMode>("simple");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const preview = useMemo(() => {
    const lines = message.split("\n");
    return lines.map((l, i) => <p key={i} className="mb-2 last:mb-0">{l || "\u00A0"}</p>);
  }, [message]);

  function onSubmit() {
    setResult(null);
    const fd = new FormData();
    fd.set("subject", subject);
    fd.set("message", message);
    fd.set("style", style);

    startTransition(async () => {
      const res = await sendNewsletterEmailAction(fd);
      if (!res?.ok) {
        setResult({ ok: false, text: res?.error || "Failed." });
        return;
      }
      setResult({
        ok: true,
        text: `Sent: ${res.sent}/${res.total} (Failed: ${res.failed})`,
      });
      setSubject("");
      setMessage("");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
        <div className="flex-1">
          <label className="text-sm font-medium">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. New drop this week 🔥"
            className="mt-1 w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Email style:</span>
          <button
            type="button"
            onClick={() => setStyle("simple")}
            className={`px-3 py-2 rounded-xl border text-sm ${
              style === "simple" ? "bg-black text-white border-black" : "hover:bg-gray-50"
            }`}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => setStyle("pretty")}
            className={`px-3 py-2 rounded-xl border text-sm ${
              style === "pretty" ? "bg-black text-white border-black" : "hover:bg-gray-50"
            }`}
          >
            Pretty
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your newsletter message here..."
            rows={12}
            className="mt-1 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isPending || !subject.trim() || !message.trim()}
              className="rounded-xl border px-5 py-2.5 font-medium hover:bg-gray-50 disabled:opacity-60"
            >
              {isPending ? "Sending..." : "Send to all subscribers"}
            </button>

            {result && (
              <div className={`text-sm ${result.ok ? "text-green-700" : "text-red-600"}`}>
                {result.text}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Tip: use line breaks — they’ll be preserved in both styles.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-semibold mb-2">Preview</div>
          <div className="text-xs text-gray-500 mb-3">
            Style: <span className="font-medium text-gray-700">{style}</span>
          </div>
          <div className="rounded-xl border bg-gray-50 p-4">
            <div className="text-base font-semibold mb-3">{subject || "Subject preview..."}</div>
            <div className="text-sm text-gray-800 leading-relaxed">{preview}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
