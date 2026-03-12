"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronDown,
  LogOut,
  LogIn,
  User,
  HelpCircle,
  Menu,
  X,
  ShoppingCart,
  Search,
  Truck,
  Check,
  Languages,
} from "lucide-react";

function normalizeUrl(u?: string | null) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

function isExternalUrl(u: string) {
  return /^https?:\/\//i.test(u) || u.startsWith("//");
}

/**
 * Optional: pass cartCount to show the cart badge.
 * e.g. <Header cartCount={cart.totalQty} />
 */
export default function Header({ cartCount = 0 }: { cartCount?: number }) {
  const t = useTranslations("Header");
  const locale = useLocale() as "en" | "pt";
  const pathname = usePathname();
  const router = useRouter();

  const { data: session, status, update } = useSession();
  const isAdmin = (session?.user as any)?.isAdmin === true;

  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSearchMobile, setShowSearchMobile] = useState(false);

  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    lastYRef.current = window.scrollY || 0;

    const onScroll = () => {
      const run = () => {
        const y = window.scrollY || 0;
        const goingDown = y > lastYRef.current;
        const lockHeader = mobileOpen || userOpen || showSearchMobile;

        if (!lockHeader) {
          const passed = y > 40;
          setHidden(passed && goingDown);
        }

        lastYRef.current = y;
        rafRef.current = null;
      };

      if (rafRef.current == null) {
        rafRef.current = window.requestAnimationFrame(run);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mobileOpen, userOpen, showSearchMobile]);

  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const userBtnRef = useRef<HTMLButtonElement | null>(null);
  const userMenuMobileRef = useRef<HTMLDivElement | null>(null);
  const userBtnMobileRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      if (!userOpen) return;
      const target = e.target as Node;

      const insideDesktop =
        userMenuRef.current?.contains(target) || userBtnRef.current?.contains(target);

      const insideMobile =
        userMenuMobileRef.current?.contains(target) ||
        userBtnMobileRef.current?.contains(target);

      if (insideDesktop || insideMobile) return;
      setUserOpen(false);
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUserOpen(false);
        setMobileOpen(false);
        setShowSearchMobile(false);
      }
    };

    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [userOpen]);

  useEffect(() => {
    if (!update) return;

    const refresh = () => {
      if (status === "authenticated") update();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const onFocus = () => refresh();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "profile:updated") refresh();
    };

    const onCustom = () => refresh();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    window.addEventListener("profile:updated", onCustom as EventListener);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("profile:updated", onCustom as EventListener);
    };
  }, [status, update]);

  const avatarSrc = normalizeUrl(session?.user?.image || undefined) || undefined;
  const displayName = session?.user?.name || session?.user?.email || t("userFallback");

  function handleChangeLocale(nextLocale: "en" | "pt") {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur transition-transform duration-300 glass ${
          hidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="container-fw hidden h-24 items-center md:flex">
          <Link
            href="/"
            className="flex shrink-0 items-center md:-ml-8 lg:-ml-12 xl:-ml-14 2xl:-ml-16"
            aria-label="FootballWorld"
          >
            <Image
              src="/logo.png"
              alt="FootballWorld"
              width={120}
              height={120}
              priority
              className="h-[56px] w-auto object-contain lg:h-[58px] xl:h-[60px]"
            />
            <span className="sr-only">FootballWorld</span>
          </Link>

          <div className="ml-3 flex min-w-0 flex-1 items-center">
            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-5 text-[15px] font-medium text-gray-900 lg:flex xl:gap-7 2xl:gap-8">
              <Link
                href="/nations"
                className="whitespace-nowrap transition-colors hover:text-blue-700"
              >
                {t("nations")}
              </Link>

              <Link
                href="/leagues"
                className="whitespace-nowrap transition-colors hover:text-blue-700"
              >
                {t("leagues")}
              </Link>

              <Link
                href="/clubs"
                className="whitespace-nowrap transition-colors hover:text-blue-700"
              >
                {t("clubs")}
              </Link>

              <Link
                href="/pt-stock"
                className="inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-blue-700"
              >
                <Truck className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{t("portugalDelivery")}</span>
              </Link>

              <Link
                href="/faq"
                className="whitespace-nowrap transition-colors hover:text-blue-700"
              >
                {t("faq")}
              </Link>
            </nav>

            <div className="ml-4 flex shrink-0 items-center gap-2 lg:ml-5 xl:gap-2.5">
              <SearchBar className="hidden lg:block" />

              <Link
                href="/cart"
                aria-label={t("openCart")}
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/15 bg-white hover:bg-gray-100"
                title={t("cart")}
                data-cart-anchor="true"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span
                    aria-label={t("itemsInCart", { count: cartCount })}
                    className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold leading-none text-white"
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {status === "authenticated" ? (
                <div className="relative">
                  <button
                    ref={userBtnRef}
                    type="button"
                    onClick={() => setUserOpen((v) => !v)}
                    className="group inline-flex h-12 items-center gap-2 rounded-full border border-black/15 bg-white px-2.5 pr-3 hover:bg-gray-100"
                    aria-haspopup="menu"
                    aria-expanded={userOpen}
                    aria-controls="user-menu"
                    aria-label={t("userMenu")}
                  >
                    <Avatar
                      key={avatarSrc || "__"}
                      src={avatarSrc}
                      name={displayName}
                      size={38}
                    />
                    <ChevronDown
                      className={`h-4.5 w-4.5 transition-transform ${
                        userOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {userOpen && (
                    <div
                      ref={userMenuRef}
                      id="user-menu"
                      role="menu"
                      aria-label={t("userMenu")}
                      className="absolute right-0 mt-2 w-56 rounded-2xl border bg-white p-1 shadow-xl"
                    >
                      <div className="px-3 py-2">
                        <div className="text-xs text-gray-500">{t("signedInAs")}</div>
                        <div className="truncate text-sm font-medium">{displayName}</div>
                      </div>

                      <MenuItem
                        href="/account"
                        icon={<User className="h-4 w-4" />}
                        onClick={() => setUserOpen(false)}
                      >
                        {t("accountPage")}
                      </MenuItem>

                      {isAdmin && (
                        <MenuItem
                          href="/admin"
                          icon={<User className="h-4 w-4" />}
                          onClick={() => setUserOpen(false)}
                        >
                          {t("adminPanel")}
                        </MenuItem>
                      )}

                      <div className="my-1 h-px bg-gray-100" />

                      <MenuItem
                        href="/faq"
                        icon={<HelpCircle className="h-4 w-4" />}
                        onClick={() => setUserOpen(false)}
                      >
                        {t("helpFaq")}
                      </MenuItem>

                      <MenuButton
                        onClick={() => signOut({ callbackUrl: `/${locale}` })}
                        icon={<LogOut className="h-4 w-4" />}
                      >
                        {t("signOut")}
                      </MenuButton>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/account/signup"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-black/15 bg-white px-4 text-sm font-medium hover:bg-gray-100"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="whitespace-nowrap">{t("signUp")}</span>
                </Link>
              )}

              <CompactLanguageSwitcher
                locale={locale}
                onChangeLocale={handleChangeLocale}
              />
            </div>
          </div>
        </div>

        <div className="container-fw flex h-20 items-center justify-between md:hidden">
          <button
            type="button"
            aria-label={t("openMenu")}
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-xl border px-3 py-2 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link href="/" className="flex items-center gap-2" aria-label="FootballWorld">
            <Image
              src="/logo.png"
              alt="FootballWorld"
              width={96}
              height={96}
              priority
              className="h-14 w-auto object-contain"
            />
            <span className="sr-only">FootballWorld</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t("openSearch")}
              onClick={() => setShowSearchMobile((v) => !v)}
              className="inline-flex items-center justify-center rounded-full border p-2 hover:bg-gray-100"
              title={t("search")}
            >
              <Search className="h-5 w-5" />
            </button>

            <Link
              href="/cart"
              aria-label={t("openCart")}
              className="relative inline-flex items-center justify-center rounded-full border p-2 hover:bg-gray-100"
              title={t("cart")}
              data-cart-anchor="true"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span
                  aria-label={t("itemsInCart", { count: cartCount })}
                  className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold leading-none text-white"
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {status === "authenticated" ? (
              <button
                ref={userBtnMobileRef}
                type="button"
                onClick={() => setUserOpen((v) => !v)}
                className="inline-flex items-center justify-center rounded-full border p-1.5 hover:bg-gray-100"
                aria-haspopup="menu"
                aria-expanded={userOpen}
                aria-controls="user-menu-mobile"
                aria-label={t("userMenu")}
              >
                <Avatar
                  key={avatarSrc || "__m"}
                  src={avatarSrc}
                  name={displayName}
                  size={36}
                />
              </button>
            ) : (
              <Link
                href="/account/signup"
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 whitespace-nowrap hover:bg-gray-100"
                aria-label={t("signUp")}
              >
                <LogIn className="h-4 w-4 shrink-0" />
                <span className="shrink-0 whitespace-nowrap text-[13px] font-medium leading-none">
                  {t("signUp")}
                </span>
              </Link>
            )}

            <CompactLanguageSwitcher
              locale={locale}
              onChangeLocale={handleChangeLocale}
              mobile
            />
          </div>
        </div>

        {showSearchMobile && (
          <div className="container-fw pb-3 md:hidden">
            <SearchBar
              className="w-full"
              onSubmitted={() => setShowSearchMobile(false)}
            />
          </div>
        )}

        {userOpen && (
          <div
            ref={userMenuMobileRef}
            id="user-menu-mobile"
            role="menu"
            aria-label={t("userMenu")}
            className="container-fw md:hidden"
          >
            <div className="mx-auto mt-2 w-full max-w-sm rounded-2xl border bg-white p-2 shadow-lg">
              <div className="px-3 py-2">
                <div className="text-xs text-gray-500">{t("signedInAs")}</div>
                <div className="truncate text-sm font-medium">{displayName}</div>
              </div>

              <MenuItem
                href="/account"
                icon={<User className="h-4 w-4" />}
                onClick={() => setUserOpen(false)}
              >
                {t("accountPage")}
              </MenuItem>

              {isAdmin && (
                <MenuItem
                  href="/admin"
                  icon={<User className="h-4 w-4" />}
                  onClick={() => setUserOpen(false)}
                >
                  {t("adminPanel")}
                </MenuItem>
              )}

              <div className="my-1 h-px bg-gray-100" />

              <MenuItem
                href="/faq"
                icon={<HelpCircle className="h-4 w-4" />}
                onClick={() => setUserOpen(false)}
              >
                {t("helpFaq")}
              </MenuItem>

              <MenuButton
                onClick={() => signOut({ callbackUrl: `/${locale}` })}
                icon={<LogOut className="h-4 w-4" />}
              >
                {t("signOut")}
              </MenuButton>
            </div>
          </div>
        )}
      </header>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} title={t("menu")}>
        <div className="border-b px-4 pb-6 pt-3">
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={() => setMobileOpen(false)}
            aria-label="FootballWorld"
          >
            <Image
              src="/logo.png"
              alt="FootballWorld"
              width={120}
              height={120}
              priority
              className="h-14 w-auto object-contain"
            />
            <span className="sr-only">FootballWorld</span>
          </Link>
        </div>

        <div className="border-b px-4 py-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t("language")}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <LanguageOptionButton
              active={locale === "en"}
              label={t("english")}
              flag="🇬🇧"
              onClick={() => {
                handleChangeLocale("en");
                setMobileOpen(false);
              }}
            />
            <LanguageOptionButton
              active={locale === "pt"}
              label={t("portuguese")}
              flag="🇵🇹"
              onClick={() => {
                handleChangeLocale("pt");
                setMobileOpen(false);
              }}
            />
          </div>
        </div>

        <nav className="px-2 py-2 text-base">
          <MobileLink href="/nations" onClick={() => setMobileOpen(false)}>
            {t("nations")}
          </MobileLink>

          <MobileLink href="/leagues" onClick={() => setMobileOpen(false)}>
            {t("leagues")}
          </MobileLink>

          <MobileLink href="/clubs" onClick={() => setMobileOpen(false)}>
            {t("clubs")}
          </MobileLink>

          <MobileLink href="/pt-stock" onClick={() => setMobileOpen(false)}>
            {t("portugalDelivery")}
          </MobileLink>

          <MobileLink href="/faq" onClick={() => setMobileOpen(false)}>
            {t("faq")}
          </MobileLink>

          <MobileLink href="/cart" onClick={() => setMobileOpen(false)}>
            {t("cart")}
          </MobileLink>
        </nav>

        <div className="mt-auto border-t p-3">
          {status === "authenticated" ? (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                signOut({ callbackUrl: `/${locale}` });
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              {t("signOut")}
            </button>
          ) : (
            <Link
              href="/account/signup"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 whitespace-nowrap hover:bg-gray-50"
              onClick={() => setMobileOpen(false)}
            >
              <LogIn className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{t("signUp")}</span>
            </Link>
          )}
        </div>
      </MobileDrawer>
    </>
  );
}

/* ===== Compact language UI ===== */

function CompactLanguageSwitcher({
  locale,
  onChangeLocale,
  mobile = false,
}: {
  locale: "en" | "pt";
  onChangeLocale: (nextLocale: "en" | "pt") => void;
  mobile?: boolean;
}) {
  const t = useTranslations("Header");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!wrapRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const currentLabel = locale === "en" ? "EN" : "PT";
  const currentFlag = locale === "en" ? "🇬🇧" : "🇵🇹";

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-12 items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 text-sm font-medium hover:bg-gray-100 ${
          mobile ? "px-2.5" : "pr-2.5"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("language")}
        title={t("language")}
      >
        <Languages className="h-4 w-4" />
        <span aria-hidden="true">{currentFlag}</span>
        {!mobile && <span className="text-[13px]">{currentLabel}</span>}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("language")}
          className="absolute right-0 mt-2 min-w-[150px] overflow-hidden rounded-2xl border bg-white p-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitemradio"
            aria-checked={locale === "en"}
            onClick={() => {
              onChangeLocale("en");
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
              locale === "en" ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true">🇬🇧</span>
              <span>{t("english")}</span>
            </span>
            {locale === "en" ? <Check className="h-4 w-4" /> : null}
          </button>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={locale === "pt"}
            onClick={() => {
              onChangeLocale("pt");
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
              locale === "pt" ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true">🇵🇹</span>
              <span>{t("portuguese")}</span>
            </span>
            {locale === "pt" ? <Check className="h-4 w-4" /> : null}
          </button>
        </div>
      )}
    </div>
  );
}

function LanguageOptionButton({
  active,
  flag,
  label,
  onClick,
}: {
  active: boolean;
  flag: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
        active ? "border-black bg-black text-white" : "hover:bg-gray-50"
      }`}
      aria-pressed={active}
    >
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true">{flag}</span>
        <span>{label}</span>
      </span>
      {active ? <Check className="h-4 w-4" /> : null}
    </button>
  );
}

/* ===== Search component (with live preview) ===== */

type ProductSearchItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string | null;
  clubName?: string | null;
};

const SEARCH_API = "/api/search/products";

function SearchBar({
  className = "",
  onSubmitted,
}: {
  className?: string;
  onSubmitted?: () => void;
}) {
  const t = useTranslations("Header");
  const locale = useLocale();
  const router = useRouter();

  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ProductSearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<number>(-1);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(target)) {
        setOpen(false);
        setActive(-1);
      }
    };

    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []);

  const sortByRelevance = (arr: ProductSearchItem[], q: string) => {
    const phrase = q.toLowerCase();

    return [...arr].sort((a, b) => {
      const an = (a.name + " " + (a.clubName || "")).toLowerCase();
      const bn = (b.name + " " + (b.clubName || "")).toLowerCase();

      const aExact = an === phrase ? 1 : 0;
      const bExact = bn === phrase ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      const aStarts = an.startsWith(phrase) ? 1 : 0;
      const bStarts = bn.startsWith(phrase) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;

      const aIdx = an.indexOf(phrase);
      const bIdx = bn.indexOf(phrase);
      if (aIdx !== bIdx) {
        return (aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx) -
          (bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx);
      }

      return a.name.localeCompare(b.name);
    });
  };

  const fetchResults = useCallback(
    (q: string) => {
      if (abortRef.current) abortRef.current.abort();

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true);
      setError(null);

      const url = `${SEARCH_API}?q=${encodeURIComponent(q)}&limit=12`;

      fetch(url, { signal: ctrl.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          const arr: ProductSearchItem[] = Array.isArray(data?.items) ? data.items : [];

          const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
          const narrowed = arr.filter((item) => {
            const hay = (item.name + " " + (item.clubName || "")).toLowerCase();
            return terms.every((termPart) => hay.includes(termPart));
          });

          const sorted = sortByRelevance(narrowed, q);
          setItems(sorted);
          setOpen(true);
        })
        .catch((err) => {
          if ((err as any).name === "AbortError") return;
          setError(t("failedToLoadResults"));
          setItems([]);
          setOpen(true);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [t]
  );

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (term.trim().length < 2) {
      setItems([]);
      setOpen(Boolean(term.trim().length));
      setLoading(false);
      setError(null);
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      fetchResults(term.trim());
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [term, fetchResults]);

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setOpen(false);
    setActive(-1);
    onSubmitted?.();

    const q = term.trim();
    if (!q) return;

    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, (items?.length ?? 0) - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (active >= 0 && items[active]) {
        e.preventDefault();
        const item = items[active];
        setOpen(false);
        setActive(-1);
        onSubmitted?.();
        router.push(`/products/${item.slug}`);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <form
        role="search"
        aria-label={t("siteWideSearch")}
        action="/search"
        method="GET"
        onSubmit={onSubmit}
        className="group relative"
      >
        <div className="rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-sky-500 p-[1.5px] shadow-[0_6px_20px_-8px_rgba(59,130,246,0.45)]">
          <div
            className="relative rounded-full bg-white/80 ring-1 ring-black/5 backdrop-blur transition hover:ring-gray-300 focus-within:ring-blue-500"
            role="combobox"
            aria-expanded={open}
            aria-controls="search-popover"
            aria-haspopup="listbox"
          >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="search"
              name="q"
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setOpen(true);
              }}
              onFocus={() => term.trim().length >= 2 && setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder={t("searchProductsPlaceholder")}
              className="w-full rounded-full bg-transparent py-2.5 pl-9 pr-24 text-sm outline-none transition-[width] duration-300 sm:w-[18rem] sm:group-focus-within:w-[22rem] lg:w-[18.5rem] xl:w-[21rem] 2xl:w-[25rem]"
              aria-label={t("searchProducts")}
              aria-autocomplete="list"
              aria-controls="search-popover"
              autoComplete="off"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
              aria-label={t("submitSearch")}
            >
              {t("search")}
            </button>
          </div>
        </div>
      </form>

      {open && (
        <div
          id="search-popover"
          role="listbox"
          aria-label={t("searchSuggestions")}
          className="absolute right-0 z-50 mt-2 w-[min(30rem,92vw)] overflow-hidden rounded-2xl border bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur"
        >
          {loading && (
            <div className="p-4 text-sm text-gray-500">{t("searching")}</div>
          )}

          {!loading && error && (
            <div className="p-4 text-sm text-red-600">{error}</div>
          )}

          {!loading && !error && term.trim().length >= 2 && items.length === 0 && (
            <div className="p-4 text-sm text-gray-600">
              {t("noResultsFor")} “<span className="font-semibold">{term}</span>”.
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <ul className="max-h-[70vh] overflow-auto">
              {items.map((item, idx) => {
                const imgSrc = normalizeUrl(item.imageUrl) || "/placeholder.png";

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active === idx}
                      onMouseEnter={() => setActive(idx)}
                      onMouseLeave={() => setActive(-1)}
                      onClick={() => {
                        setOpen(false);
                        setActive(-1);
                        onSubmitted?.();
                        router.push(`/products/${item.slug}`);
                      }}
                      className={`flex w-full items-center gap-3 p-2.5 text-left transition ${
                        active === idx ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="relative h-12 w-12 overflow-hidden rounded-xl border bg-white">
                        <Image
                          src={imgSrc}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized={isExternalUrl(imgSrc)}
                          loading="lazy"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{item.name}</div>
                        <div className="truncate text-xs text-gray-500">
                          {item.clubName || t("product")}
                        </div>
                      </div>

                      <div className="shrink-0 text-sm font-semibold">
                        {formatPrice(item.price, locale)}
                      </div>
                    </button>
                  </li>
                );
              })}

              <li className="border-t">
                <Link
                  href={`/search?q=${encodeURIComponent(term.trim())}`}
                  onClick={() => {
                    setOpen(false);
                    setActive(-1);
                    onSubmitted?.();
                  }}
                  className="flex items-center justify-center gap-2 p-2.5 text-sm font-medium hover:bg-gray-50"
                >
                  {t("viewAllResultsFor")} “{term.trim()}”
                </Link>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function formatPrice(price: number, locale: string) {
  try {
    return new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-IE", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  } catch {
    return `${price}€`;
  }
}

/* ===== Helpers / UI ===== */

function MenuItem({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-gray-50"
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

function MenuButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-50"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function Avatar({
  src,
  name,
  size = 40,
}: {
  src?: string;
  name?: string;
  size?: number;
}) {
  const safeSrc = normalizeUrl(src);
  const initials = (name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (safeSrc) {
    return (
      <div
        className="relative overflow-hidden rounded-full"
        style={{ width: size, height: size }}
      >
        <Image
          src={safeSrc}
          alt={name || "Avatar"}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized={isExternalUrl(safeSrc)}
        />
      </div>
    );
  }

  return (
    <div
      className="grid place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-white"
      style={{ width: size, height: size }}
      aria-label={name || "Avatar"}
      title={name}
    >
      <span className="text-[14px] font-semibold leading-none">{initials}</span>
    </div>
  );
}

function MobileLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-xl px-3 py-3 hover:bg-gray-50"
    >
      {children}
    </Link>
  );
}

function MobileDrawer({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}) {
  const t = useTranslations("Header");

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[999] bg-black/30 backdrop-blur-[2px] transition-opacity md:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-[1000] grid w-[86%] max-w-sm grid-rows-[auto_1fr] bg-white shadow-2xl transition-transform duration-300 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b p-3">
          <div className="text-sm font-medium">{title}</div>
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto">{children}</div>
      </aside>
    </>
  );
}