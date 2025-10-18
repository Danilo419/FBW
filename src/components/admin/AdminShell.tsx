// src/app/admin/(panel)/AdminShell.tsx  (ou o nome do ficheiro que mostraste)
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

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

  // Load saved width
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parseInt(saved, 10)));
        setWidth(parsed);
      }
    } catch {}
  }, []);

  // Persist when width changes (if not collapsed)
  useEffect(() => {
    if (!collapsed) {
      try {
        localStorage.setItem(STORAGE_KEY, String(width));
      } catch {}
    }
  }, [width, collapsed]);

  // Drag handlers
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
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
    <div className="min-h-screen bg-gray-50" style={{ display: "grid", gridTemplateColumns: gridTemplate }}>
      <Sidebar collapsed={collapsed} toggleCollapsed={toggleCollapsed} onMouseDown={onMouseDown} />
      <main className="p-4 md:p-8 overflow-x-auto">{children}</main>
    </div>
  );
}

/* ---------------- Sidebar ---------------- */
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

  const nav = [
    { href: "/admin", label: "Dashboard", short: "Dash" },
    { href: "/admin/orders", label: "Orders", short: "Ord." },
    { href: "/admin/products", label: "Products", short: "Prod." }, // ✅ enabled
    { href: "/admin/analytics", label: "Analytics", short: "An." },
  ];

  const isActive = (href: string) =>
    pathname === href || (href !== "/admin" && pathname?.startsWith(href));

  return (
    <aside className="relative bg-white border-r p-3 md:p-4">
      {/* Sidebar header */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="block text-lg md:text-xl font-extrabold truncate">
          {collapsed ? "FW" : <>FootBallWorld<span className="text-gray-400"> • Admin</span></>}
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

      {/* Navigation */}
      <nav className="space-y-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            className={[
              "block rounded-lg px-3 py-2 truncate transition",
              isActive(item.href) ? "bg-gray-100 font-semibold" : "hover:bg-gray-100",
            ].join(" ")}
            href={item.href}
            title={item.label}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            {collapsed ? item.short : item.label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <form action="/admin/logout" method="POST" className="mt-4">
        <button
          type="submit"
          className="w-full rounded-lg border px-3 py-2 hover:bg-gray-50 truncate"
          title="Sign out"
        >
          {collapsed ? "Logout" : "Sign out"}
        </button>
      </form>

      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute top-0 right-[-3px] h-full w-1.5 cursor-col-resize select-none"
        style={{
          background: "linear-gradient(to right, transparent 0, rgba(0,0,0,0.08) 50%, transparent 100%)",
        }}
        title="Drag to resize"
      />
    </aside>
  );
}
