// src/components/admin/PrintButton.tsx
"use client";

export function PrintButton({ className = "", children = "Print" }:{
  className?: string; children?: React.ReactNode;
}) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      {children}
    </button>
  );
}
