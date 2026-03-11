// src/components/site/LocaleSwitcher.tsx
"use client";

import {useLocale} from "next-intl";
import {usePathname, useRouter} from "@/i18n/navigation";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function changeLocale(nextLocale: "en" | "pt") {
    router.replace(pathname, {locale: nextLocale});
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => changeLocale("en")}
        disabled={locale === "en"}
        className={`rounded-md px-2 py-1 text-sm border ${
          locale === "en" ? "bg-black text-white border-black" : "bg-white text-black border-neutral-300"
        }`}
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => changeLocale("pt")}
        disabled={locale === "pt"}
        className={`rounded-md px-2 py-1 text-sm border ${
          locale === "pt" ? "bg-black text-white border-black" : "bg-white text-black border-neutral-300"
        }`}
      >
        PT
      </button>
    </div>
  );
}