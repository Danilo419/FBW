// src/app/[locale]/admin/ClientAdminLayout.tsx
"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";

/**
 * Sidebar with:
 * - Drag-to-resize (when expanded)
 * - Collapse/expand with animation
 * - “Peek” on hover when collapsed
 * - Clean rail when collapsed (no text); shows only a grab symbol
 */

const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 180;
const MAX_WIDTH = 420;
const COLLAPSED_WIDTH = 72;
const WIDTH_KEY = "adminSidebarWidth";
const COLLAPSED_KEY = "adminSidebarCollapsed";

export default function ClientAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [peeking, setPeeking] = useState(false);

  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    try {
      const w = localStorage.getItem(WIDTH_KEY);
      if (w) {
        const parsed = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, parseInt(w, 10))
        );
        if (!Number.isNaN(parsed)) setWidth(parsed);
      }

      const c = localStorage.getItem(COLLAPSED_KEY);
      if (c) setCollapsed(c === "1");
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (!collapsed) localStorage.setItem(WIDTH_KEY, String(width));
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {}
  }, [width, collapsed]);

  const onDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (collapsed) return;
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || collapsed) return;
      const delta = e.clientX - startXRef.current;
      const next = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidthRef.current + delta)
      );
      setWidth(next);
    };

    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((c) => !c);
  const effectiveWidth = collapsed && !peeking ? COLLAPSED_WIDTH : width;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside
        className="relative border-r bg-white"
        style={{
          width: effectiveWidth,
          minWidth: effectiveWidth,
          transition:
            "width 260ms cubic-bezier(0.22,1,0.36,1), min-width 260ms cubic-bezier(0.22,1,0.36,1)",
        }}
        onMouseEnter={() => collapsed && setPeeking(true)}
        onMouseLeave={() => setPeeking(false)}
      >
        <div className="flex h-full flex-col p-3 md:p-4">
          <SidebarTop
            collapsed={collapsed}
            peeking={peeking}
            toggleCollapsed={toggleCollapsed}
          />

          {collapsed && !peeking ? (
            <div className="flex flex-1 select-none items-center justify-center text-gray-400">
              <span aria-hidden className="text-2xl leading-none">
                ⠿
              </span>
            </div>
          ) : (
            <>
              <SidebarNav />
              <div className="flex-1" />
              <SidebarLogout />
            </>
          )}
        </div>

        {!collapsed && (
          <div
            onMouseDown={onDragStart}
            className="absolute top-0 right-[-3px] h-full w-1.5 cursor-col-resize select-none"
            style={{
              background:
                "linear-gradient(to right, transparent 0, rgba(0,0,0,0.08) 50%, transparent 100%)",
            }}
            title="Drag to resize"
          />
        )}
      </aside>

      <main className="flex-1 overflow-x-auto p-4 md:p-8">{children}</main>
    </div>
  );
}

function SidebarTop({
  collapsed,
  peeking,
  toggleCollapsed,
}: {
  collapsed: boolean;
  peeking: boolean;
  toggleCollapsed: () => void;
}) {
  const locale = useLocale();

  return (
    <div className="mb-4 flex items-center justify-between">
      {collapsed && !peeking ? (
        <span className="sr-only">FootBallWorld • Admin</span>
      ) : (
        <Link
          href="/"
          locale={locale}
          className="block truncate text-lg font-extrabold md:text-xl"
        >
          FootBallWorld<span className="text-gray-400"> • Admin</span>
        </Link>
      )}

      <button
        type="button"
        onClick={toggleCollapsed}
        className="ml-2 inline-flex items-center justify-center rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
        title={collapsed ? "Expand" : "Collapse"}
        aria-expanded={!collapsed}
      >
        <span className="font-bold">{collapsed ? "»" : "«"}</span>
      </button>
    </div>
  );
}

function SidebarNav() {
  return (
    <nav className="space-y-1">
      <NavItem href="/admin" label="Dashboard" />
      <NavItem href="/admin/orders" label="Orders" />
      <NavItem
        href="/admin/pt-stock/orders"
        label="PT Stock Orders"
        indent
        badge="PT"
      />
      <NavItem href="/admin/products" label="Products" />
      <NavItem
        href="/admin/pt-stock/products"
        label="PT Stock Products"
        indent
        badge="PT"
      />
      <NavItem href="/admin/users" label="Users" />
      <NavItem href="/admin/newsletter" label="Newsletter" />
      <NavItem href="/admin/analytics" label="Analytics" />
    </nav>
  );
}

function SidebarLogout() {
  const locale = useLocale();

  return (
    <form action={`/${locale}/admin/logout`} method="POST" className="mt-4">
      <button
        type="submit"
        className="w-full rounded-lg border px-3 py-2 hover:bg-gray-50"
      >
        Log out
      </button>
    </form>
  );
}

/* ---------- Nav item ---------- */
function NavItem({
  href,
  label,
  indent = false,
  badge,
}: {
  href: string;
  label: string;
  indent?: boolean;
  badge?: string;
}) {
  const pathname = usePathname();

  const active =
    pathname === href || (href !== "/admin" && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      className={[
        "flex items-center justify-between truncate rounded-lg px-3 py-2 transition",
        active ? "bg-gray-100 font-semibold" : "hover:bg-gray-100",
        indent ? "ml-4 text-sm" : "",
      ].join(" ")}
      title={label}
    >
      <span>{label}</span>

      {badge && (
        <span className="ml-2 rounded-full bg-blue-600 px-2 py-[2px] text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}