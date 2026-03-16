"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";

const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 160;
const MAX_WIDTH = 420;
const COLLAPSED_WIDTH = 72;
const STORAGE_KEY = "adminSidebarWidth";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parseInt(saved, 10)));
        if (!Number.isNaN(parsed)) setWidth(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!collapsed) {
      try {
        localStorage.setItem(STORAGE_KEY, String(width));
      } catch {}
    }
  }, [width, collapsed]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (collapsed) return;
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || collapsed) return;
      const delta = e.clientX - startXRef.current;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setWidth(next);
    };

    const onUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((c) => !c);
  const gridTemplate = collapsed ? `${COLLAPSED_WIDTH}px 1fr` : `${width}px 1fr`;

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ display: "grid", gridTemplateColumns: gridTemplate }}
    >
      <Sidebar
        collapsed={collapsed}
        toggleCollapsed={toggleCollapsed}
        onMouseDown={onMouseDown}
      />
      <main className="overflow-x-auto p-4 md:p-8">{children}</main>
    </div>
  );
}

/* ----------------- Sidebar ----------------- */
function Sidebar({
  collapsed,
  toggleCollapsed,
  onMouseDown,
}: {
  collapsed: boolean;
  toggleCollapsed: () => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const pathname = usePathname();
  const locale = useLocale();

  const items = [
    { href: `/${locale}/admin`, label: "Dashboard", short: "Dash" },
    { href: `/${locale}/admin/orders`, label: "Orders", short: "Ord." },
    { href: `/${locale}/admin/pt-stock/orders`, label: "PT Stock Orders", short: "PT Ord." },
    { href: `/${locale}/admin/products`, label: "Products", short: "Prod." },
    { href: `/${locale}/admin/pt-stock/products`, label: "PT Stock Products", short: "PT Prod." },
    { href: `/${locale}/admin/users`, label: "Users", short: "Users" },
    { href: `/${locale}/admin/newsletter`, label: "Newsletter", short: "News" },
    { href: `/${locale}/admin/analytics`, label: "Analytics", short: "An." },
  ];

  const dashboardHref = `/${locale}/admin`;
  const logoutAction = `/${locale}/admin/logout`;

  const isActive = (href: string) =>
    pathname === href || (href !== dashboardHref && pathname?.startsWith(href));

  return (
    <aside className="relative border-r bg-white p-3 md:p-4">
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/${locale}`} className="block truncate text-lg font-extrabold md:text-xl">
          {collapsed ? (
            "FW"
          ) : (
            <>
              FootBallWorld<span className="text-gray-400"> • Admin</span>
            </>
          )}
        </Link>

        <button
          type="button"
          onClick={toggleCollapsed}
          className="ml-2 inline-flex items-center justify-center rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
          title={collapsed ? "Expand" : "Collapse"}
        >
          <span className="font-bold">{collapsed ? "»" : "«"}</span>
        </button>
      </div>

      <nav className="space-y-1">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            title={it.label}
            aria-current={isActive(it.href) ? "page" : undefined}
            className={[
              "block truncate rounded-lg px-3 py-2 transition",
              isActive(it.href) ? "bg-gray-100 font-semibold" : "hover:bg-gray-100",
            ].join(" ")}
          >
            {collapsed ? it.short : it.label}
          </Link>
        ))}
      </nav>

      <form action={logoutAction} method="POST" className="mt-4">
        <button
          type="submit"
          className="w-full truncate rounded-lg border px-3 py-2 hover:bg-gray-50"
          title="Sign out"
        >
          {collapsed ? "Logout" : "Sign out"}
        </button>
      </form>

      {!collapsed && (
        <div
          onMouseDown={onMouseDown}
          className="absolute top-0 right-[-3px] h-full w-1.5 cursor-col-resize select-none"
          style={{
            background:
              "linear-gradient(to right, transparent 0, rgba(0,0,0,0.08) 50%, transparent 100%)",
          }}
          title="Drag to resize"
        />
      )}
    </aside>
  );
}