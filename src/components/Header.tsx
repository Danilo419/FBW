// src/components/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  ChevronDown,
  LogOut,
  LogIn,
  User,
  ArrowLeftRight,
  HelpCircle,
  Menu,
  X,
  ShoppingCart,
  Search,
} from "lucide-react";

/**
 * Optional: pass cartCount to show the cart badge.
 * e.g. <Header cartCount={cart.totalQty} />
 */
export default function Header({ cartCount = 0 }: { cartCount?: number }) {
  // Safe pattern: avoid destructuring directly (prevents SSR/undefined errors)
  const s = useSession();
  const session = s?.data;
  const status = s?.status;

  const isAdmin = (session?.user as any)?.isAdmin === true;

  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSearchMobile, setShowSearchMobile] = useState(false);

  // ===== Auto-hide on scroll =====
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    lastYRef.current = window.scrollY || 0;

    const onScroll = () => {
      const run = () => {
        const y = window.scrollY || 0;
        const goingDown = y > lastYRef.current;
        const passed = y > 40;

        // do not hide when menus/search are open
        const lockHeader = mobileOpen || userOpen || showSearchMobile;

        if (!lockHeader) {
          if (passed && goingDown) setHidden(true);
          else setHidden(false);
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

  // Dropdown user
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const userBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!userOpen) return;
      const t = e.target as Node;
      if (userMenuRef.current?.contains(t) || userBtnRef.current?.contains(t)) return;
      setUserOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUserOpen(false);
        setMobileOpen(false);
        setShowSearchMobile(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [userOpen]);

  const avatarSrc = session?.user?.image || undefined;
  const displayName = session?.user?.name || session?.user?.email || "User";

  return (
    <header
      className={`sticky top-0 z-50 glass border-b border-white/60 bg-white/70 backdrop-blur transform transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {/* DESKTOP BAR */}
      <div className="container-fw hidden md:flex h-24 items-center gap-4">
        {/* Logo (left) */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/logo.png"
            alt="FootballWorld"
            width={120}
            height={120}
            priority
            className="h-16 w-auto object-contain"
          />
          <span className="sr-only">FootballWorld</span>
        </Link>

        {/* Centered nav */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-10 text-[16px] font-medium">
          <Link href="/products" className="hover:text-blue-700">Products</Link>
          <Link href="/players" className="hover:text-blue-700">Players</Link>
          <Link href="/clubs" className="hover:text-blue-700">Clubs</Link>
          <Link href="/faq" className="hover:text-blue-700">FAQ</Link>
          {isAdmin && (
            <Link href="/admin" className="hover:text-blue-700">Admin</Link>
          )}
        </nav>

        {/* Right: Search pushed to the right + Cart + User */}
        <div className="ml-auto flex items-center gap-3">
          {/* Search (desktop) — now right aligned and prettier */}
          <SearchBar className="hidden lg:block" />

          {/* Cart */}
          <Link
            href="/cart"
            aria-label="Open cart"
            className="relative inline-flex items-center justify-center rounded-full border p-2 hover:bg-gray-100"
            title="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span
                aria-label={`${cartCount} items in cart`}
                className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 grid place-items-center rounded-full bg-blue-600 text-white text-[11px] leading-none font-semibold"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {/* User */}
          {status === "authenticated" ? (
            <div className="relative">
              <button
                ref={userBtnRef}
                onClick={() => setUserOpen(v => !v)}
                className="group inline-flex items-center gap-2 rounded-full border px-3 py-2 hover:bg-gray-100"
                aria-haspopup="menu"
                aria-expanded={userOpen}
                aria-controls="user-menu"
              >
                <Avatar src={avatarSrc} name={displayName} size={40} />
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${userOpen ? "rotate-180" : ""}`}
                />
              </button>

              {userOpen && (
                <div
                  ref={userMenuRef}
                  id="user-menu"
                  role="menu"
                  aria-label="User menu"
                  className="absolute right-0 mt-2 w-56 rounded-2xl border bg-white shadow-xl p-1"
                >
                  <div className="px-3 py-2">
                    <div className="text-xs text-gray-500">Signed in as</div>
                    <div className="truncate text-sm font-medium">{displayName}</div>
                  </div>
                  <MenuItem href="/account" icon={<User className="h-4 w-4" />}>
                    Account page
                  </MenuItem>
                  {isAdmin && (
                    <MenuItem href="/admin" icon={<User className="h-4 w-4" />}>
                      Admin panel
                    </MenuItem>
                  )}
                  <MenuItem
                    href="/account/signup"
                    icon={<ArrowLeftRight className="h-4 w-4" />}
                  >
                    Change account
                  </MenuItem>
                  <div className="my-1 h-px bg-gray-100" />
                  <MenuItem href="/faq" icon={<HelpCircle className="h-4 w-4" />}>
                    Help / FAQ
                  </MenuItem>
                  <MenuButton
                    onClick={() => signOut({ callbackUrl: "/" })}
                    icon={<LogOut className="h-4 w-4" />}
                  >
                    Sign out
                  </MenuButton>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/account/signup"
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 hover:bg-gray-100 text-sm"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* MOBILE BAR */}
      <div className="container-fw md:hidden flex h-20 items-center justify-between">
        {/* Hamburger */}
        <button
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center justify-center rounded-xl border px-3 py-2 hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
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

        {/* Right side (mobile): search + cart + avatar/login */}
        <div className="flex items-center gap-2">
          {/* Search toggle (mobile) */}
          <button
            aria-label="Open search"
            onClick={() => setShowSearchMobile((v) => !v)}
            className="inline-flex items-center justify-center rounded-full border p-2 hover:bg-gray-100"
            title="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Cart (mobile) */}
          <Link
            href="/cart"
            aria-label="Open cart"
            className="relative inline-flex items-center justify-center rounded-full border p-2 hover:bg-gray-100"
            title="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span
                aria-label={`${cartCount} items in cart`}
                className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 grid place-items-center rounded-full bg-blue-600 text-white text-[11px] leading-none font-semibold"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {status === "authenticated" ? (
            <button
              onClick={() => setUserOpen(v => !v)}
              className="inline-flex items-center justify-center rounded-full border p-1.5 hover:bg-gray-100"
              aria-haspopup="menu"
              aria-expanded={userOpen}
              aria-controls="user-menu-mobile"
            >
              <Avatar src={avatarSrc} name={displayName} size={36} />
            </button>
          ) : (
            <Link
              href="/account/signup"
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 hover:bg-gray-100 text-sm"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Search row (mobile) */}
      {showSearchMobile && (
        <div className="md:hidden container-fw pb-3">
          <SearchBar className="w-full" onSubmitted={() => setShowSearchMobile(false)} />
        </div>
      )}

      {/* User dropdown (mobile) */}
      {userOpen && (
        <div id="user-menu-mobile" role="menu" className="md:hidden container-fw">
          <div className="mx-auto mt-2 w/full max-w-sm rounded-2xl border bg-white shadow-lg p-2">
            <div className="px-3 py-2">
              <div className="text-xs text-gray-500">Signed in as</div>
              <div className="truncate text-sm font-medium">{displayName}</div>
            </div>
            <MenuItem href="/account" icon={<User className="h-4 w-4" />}>
              Account page
            </MenuItem>
            {isAdmin && (
              <MenuItem href="/admin" icon={<User className="h-4 w-4" />}>
                Admin panel
              </MenuItem>
            )}
            <MenuItem
              href="/account/signup"
              icon={<ArrowLeftRight className="h-4 w-4" />}
            >
              Change account
            </MenuItem>
            <div className="my-1 h-px bg-gray-100" />
            <MenuItem href="/faq" icon={<HelpCircle className="h-4 w-4" />}>
              Help / FAQ
            </MenuItem>
            <MenuButton
              onClick={() => signOut({ callbackUrl: "/" })}
              icon={<LogOut className="h-4 w-4" />}
            >
              Sign out
            </MenuButton>
          </div>
        </div>
      )}

      {/* MOBILE DRAWER */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <div className="px-4 pt-3 pb-6 border-b">
          <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
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

        <nav className="px-2 py-2 text-base">
          <MobileLink href="/products" onClick={() => setMobileOpen(false)}>Products</MobileLink>
          <MobileLink href="/players" onClick={() => setMobileOpen(false)}>Players</MobileLink>
          <MobileLink href="/clubs" onClick={() => setMobileOpen(false)}>Clubs</MobileLink>
          <MobileLink href="/faq" onClick={() => setMobileOpen(false)}>FAQ</MobileLink>
          <MobileLink href="/cart" onClick={() => setMobileOpen(false)}>Cart</MobileLink>
          {isAdmin && <MobileLink href="/admin" onClick={() => setMobileOpen(false)}>Admin</MobileLink>}
        </nav>

        <div className="mt-auto p-3 border-t">
          {status === "authenticated" ? (
            <button
              onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/" }); }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : (
            <Link
              href="/account/signup"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 hover:bg-gray-50"
              onClick={() => setMobileOpen(false)}
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </div>
      </MobileDrawer>
    </header>
  );
}

/* ===== Search component (new visual) ===== */

function SearchBar({
  className = "",
  onSubmitted,
}: {
  className?: string;
  onSubmitted?: () => void;
}) {
  const [term, setTerm] = useState("");

  return (
    <form
      role="search"
      aria-label="Site-wide"
      action="/search"
      method="GET"
      onSubmit={() => onSubmitted?.()}
      className={`group relative ${className}`}
    >
      {/* Gradient border wrapper */}
      <div className="p-[1.5px] rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-sky-500 shadow-[0_6px_20px_-8px_rgba(59,130,246,0.45)]">
        <div className="relative rounded-full bg-white/80 backdrop-blur ring-1 ring-black/5 hover:ring-gray-300 focus-within:ring-blue-500 transition">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            name="q"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search products…"
            className="w-72 lg:w-80 xl:w-96 group-focus-within:w-[28rem] transition-[width] duration-300 rounded-full bg-transparent pl-9 pr-24 py-2 text-sm outline-none"
            aria-label="Search products"
            autoComplete="off"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition"
            aria-label="Submit search"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}

/* ===== Helpers / UI ===== */

function MenuItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      role="menuitem"
      href={href}
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
      role="menuitem"
      onClick={onClick}
      className="w-full text-left flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-gray-50"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function Avatar({ src, name, size = 40 }: { src?: string; name?: string; size?: number }) {
  const initials = (name || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="grid place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-white"
      style={{ width: size, height: size }}
      aria-label="avatar"
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

/** Mobile drawer (overlay) */
function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity md:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
        onClick={onClose}
      />
      {/* Panel */}
      <aside
        className={`fixed inset-y-0 left-0 w-[86%] max-w-sm bg-white shadow-2xl md:hidden grid grid-rows-[auto_1fr_auto]
          transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-3 border-b">
          <div className="text-sm font-medium">Menu</div>
          <button
            aria-label="Close menu"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-auto">{children}</div>
      </aside>
    </>
  );
}
