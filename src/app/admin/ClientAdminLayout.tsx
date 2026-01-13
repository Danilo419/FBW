// src/app/admin/(panel)/ClientAdminLayout.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

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
const COLLAPSED_WIDTH = 72; // rail width
const WIDTH_KEY = "adminSidebarWidth";
const COLLAPSED_KEY = "adminSidebarCollapsed";

export default function ClientAdminLayout({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [peeking, setPeeking] = useState(false);

  // drag state
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  /* ---------- load preferences ---------- */
  useEffect(() => {
    try {
      const w = localStorage.getItem(WIDTH_KEY);
      if (w) {
        const parsed = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parseInt(w, 10)));
        if (!Number.isNaN(parsed)) setWidth(parsed);
      }
      const c = localStorage.getItem(COLLAPSED_KEY);
      if (c) setCollapsed(c === "1");
    } catch {}
  }, []);

  /* ---------- persist preferences ---------- */
  useEffect(() => {
    try {
      if (!collapsed) localStorage.setItem(WIDTH_KEY, String(width));
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {}
  }, [width, collapsed]);

  /* ---------- drag to resize (expanded only) ---------- */
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
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
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

  /* ---------- collapse / expand ---------- */
  const toggleCollapsed = () => setCollapsed((c) => !c);

  // animated width; when collapsed and not peeking, use the rail width
  const effectiveWidth = collapsed && !peeking ? COLLAPSED_WIDTH : width;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className="relative bg-white border-r"
        style={{
          width: effectiveWidth,
          minWidth: effectiveWidth,
          transition:
            "width 260ms cubic-bezier(0.22,1,0.36,1), min-width 260ms cubic-bezier(0.22,1,0.36,1)",
        }}
        onMouseEnter={() => collapsed && setPeeking(true)}
        onMouseLeave={() => setPeeking(false)}
      >
        <div className="h-full p-3 md:p-4 flex flex-col">
          {/* Top */}
          <div className="mb-4 flex items-center justify-between">
            {/* When collapsed: do not show any text */}
            {collapsed && !peeking ? (
              <span className="sr-only">FootBallWorld • Admin</span>
            ) : (
              <Link href="/" className="block text-lg md:text-xl font-extrabold truncate">
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

          {/* Navigation */}
          {collapsed && !peeking ? (
            // Clean rail: no text, just a central “grab” glyph
            <div className="flex-1 flex items-center justify-center select-none text-gray-400">
              <span aria-hidden className="text-2xl leading-none">
                ⠿
              </span>
            </div>
          ) : (
            <>
              <nav className="space-y-1">
                <NavItem href="/admin" label="Dashboard" />
                <NavItem href="/admin/orders" label="Orders" />
                <NavItem href="/admin/products" label="Products" />
                <NavItem href="/admin/users" label="Users" /> {/* ✅ NEW */}
                <NavItem href="/admin/analytics" label="Analytics" />
              </nav>

              <div className="flex-1" />

              <form action="/admin/logout" method="POST" className="mt-4">
                <button
                  type="submit"
                  className="w-full rounded-lg border px-3 py-2 hover:bg-gray-50"
                  title="Log out"
                >
                  Log out
                </button>
              </form>
            </>
          )}
        </div>

        {/* Resize handle (visible only when expanded) */}
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

      {/* Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-auto" style={{ transition: "padding 200ms ease" }}>
        {children}
      </main>
    </div>
  );
}

/* ---------- Nav item (with active state) ---------- */
function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/admin" && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      className={[
        "relative block rounded-lg px-3 py-2 transition truncate",
        active ? "bg-gray-100 font-semibold" : "hover:bg-gray-100",
      ].join(" ")}
      title={label}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
