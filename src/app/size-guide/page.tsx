// src/app/size-guide/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Unit = "cm" | "in";

// ========= DATA (all base values in CM) =========
type Range = [number, number] | number; // allow single numbers for kids
type AdultRowKey = "Length" | "Width" | "Height" | "Weight";
type AdultSizeKey = "S" | "M" | "L" | "XL" | "2XL" | "3XL" | "4XL";

// Allow rows to be partial so "4XL" is not required for Player table
type AdultRows = Record<AdultRowKey, Partial<Record<AdultSizeKey, Range>>>;

type AdultTable = {
  sizes: AdultSizeKey[];
  rows: AdultRows;
};

// PLAYER (adult)
const ADULT_PLAYER: AdultTable = {
  sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
  rows: {
    Length: { S: [67, 69], M: [69, 71], L: [71, 73], XL: [73, 76], "2XL": [76, 78], "3XL": [78, 79] },
    Width:  { S: [49, 51], M: [51, 53], L: [53, 55], XL: [55, 57], "2XL": [57, 60], "3XL": [60, 63] },
    Height: { S: [162, 170], M: [170, 175], L: [175, 180], XL: [180, 185], "2XL": [185, 190], "3XL": [190, 195] },
    Weight: { S: [50, 62], M: [62, 75], L: [75, 80], XL: [80, 85], "2XL": [85, 90], "3XL": [90, 95] },
  },
};

// FAN (adult)
const ADULT_FAN: AdultTable = {
  sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  rows: {
    Length: { S: [69, 71], M: [71, 73], L: [73, 75], XL: [75, 78], "2XL": [78, 81], "3XL": [81, 83], "4XL": [83, 85] },
    Width:  { S: [53, 55], M: [55, 57], L: [57, 58], XL: [58, 60], "2XL": [60, 62], "3XL": [62, 64], "4XL": [64, 65] },
    Height: { S: [162, 170], M: [170, 176], L: [176, 182], XL: [182, 190], "2XL": [190, 195], "3XL": [192, 197], "4XL": [197, 200] },
    Weight: { S: [50, 62], M: [62, 78], L: [78, 83], XL: [83, 90], "2XL": [90, 97], "3XL": [97, 104], "4XL": [104, 110] },
  },
};

// KIDS
type KidsRow = {
  size: string; // e.g. #16
  length: number; // cm
  bust: number; // cm
  height: [number, number]; // cm
  age: string; // label
  shortsLength: number; // cm
};

const KIDS_ROWS: KidsRow[] = [
  { size: "#16", length: 43, bust: 32, height: [95, 105],  age: "2–3",  shortsLength: 32 },
  { size: "#18", length: 47, bust: 34, height: [105, 115], age: "3–4",  shortsLength: 34 },
  { size: "#20", length: 50, bust: 36, height: [115, 125], age: "4–5",  shortsLength: 36 },
  { size: "#22", length: 53, bust: 38, height: [125, 135], age: "6–7",  shortsLength: 38 },
  { size: "#24", length: 56, bust: 40, height: [135, 145], age: "8–9",  shortsLength: 39 },
  { size: "#26", length: 58, bust: 42, height: [145, 155], age: "10–11", shortsLength: 40 },
  { size: "#28", length: 61, bust: 44, height: [155, 165], age: "12–13", shortsLength: 43 },
];

// ========= Helpers =========
function toInches(v: number) {
  return +(v / 2.54).toFixed(1);
}

function renderRange(value: Range | undefined, unit: Unit) {
  if (value === undefined) return "–";
  if (Array.isArray(value)) {
    const [a, b] = value;
    return unit === "cm" ? `${a}–${b} cm` : `${toInches(a)}–${toInches(b)} in`;
  }
  return unit === "cm" ? `${value} cm` : `${toInches(value)} in`;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-3">
      <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
    </header>
  );
}

function AdultTableView({ data, unit }: { data: AdultTable; unit: Unit }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-2 bg-gray-50 border-b text-sm">
        Units: <b>{unit === "cm" ? "centimetres (cm)" : "inches (in)"}</b>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 sm:px-6 py-3 font-medium">Measurement</th>
              {data.sizes.map((s) => (
                <th key={s} className="text-left px-4 sm:px-6 py-3 font-medium">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["Length", "Width", "Height", "Weight"] as AdultRowKey[]).map((key, i) => (
              <tr key={key} className={i % 2 ? "bg-white" : "bg-gray-50/40"}>
                <td className="px-4 sm:px-6 py-3 font-semibold">{key}</td>
                {data.sizes.map((s) => (
                  <td key={s} className="px-4 sm:px-6 py-3">
                    {renderRange(data.rows[key][s], unit)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 sm:px-6 py-3 text-xs text-gray-500 border-t">
        * Values refer to the garment laid flat (manufacturing tolerances may occur).
      </p>
    </div>
  );
}

function KidsTableView({ unit }: { unit: Unit }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-2 bg-gray-50 border-b text-sm">
        Units: <b>{unit === "cm" ? "centimetres (cm)" : "inches (in)"}</b>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 sm:px-6 py-3 font-medium">Size</th>
              <th className="text-left px-4 sm:px-6 py-3 font-medium">Jersey length</th>
              <th className="text-left px-4 sm:px-6 py-3 font-medium">Chest (bust)</th>
              <th className="text-left px-4 sm:px-6 py-3 font-medium">Height</th>
              <th className="text-left px-4 sm:px-6 py-3 font-medium">Age</th>
              <th className="text-left px-4 sm:px-6 py-3 font-medium">Shorts length</th>
            </tr>
          </thead>
          <tbody>
            {KIDS_ROWS.map((r, i) => (
              <tr key={r.size} className={i % 2 ? "bg-white" : "bg-gray-50/40"}>
                <td className="px-4 sm:px-6 py-3 font-semibold">{r.size}</td>
                <td className="px-4 sm:px-6 py-3">{unit === "cm" ? `${r.length} cm` : `${toInches(r.length)} in`}</td>
                <td className="px-4 sm:px-6 py-3">{unit === "cm" ? `${r.bust} cm` : `${toInches(r.bust)} in`}</td>
                <td className="px-4 sm:px-6 py-3">
                  {unit === "cm"
                    ? `${r.height[0]}–${r.height[1]} cm`
                    : `${toInches(r.height[0])}–${toInches(r.height[1])} in`}
                </td>
                <td className="px-4 sm:px-6 py-3">{r.age} yrs</td>
                <td className="px-4 sm:px-6 py-3">
                  {unit === "cm" ? `${r.shortsLength} cm` : `${toInches(r.shortsLength)} in`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 sm:px-6 py-3 text-xs text-gray-500 border-t">
        * Approximations; if between sizes, choose the larger one.
      </p>
    </div>
  );
}

export default function SizeGuidePage() {
  const [tab, setTab] = useState<"player" | "fan" | "kids">("player");

  const adultData = useMemo(() => {
    if (tab === "fan") return ADULT_FAN;
    if (tab === "player") return ADULT_PLAYER;
    return null;
  }, [tab]);

  return (
    <main className="container-fw max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-blue-700">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700 font-medium">Size Guide</span>
      </nav>

      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Size Guide</h1>
        <p className="mt-2 text-gray-600">
          Choose between <b>Adult (Player)</b>, <b>Adult (Fan)</b> and <b>Kids</b>.
          Each section shows tables in <b>cm</b> and <b>inches</b>.
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-5 inline-flex rounded-xl border p-1 bg-white shadow-sm">
        <button
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === "player" ? "bg-blue-600 text-white" : "hover:bg-gray-50"}`}
          onClick={() => setTab("player")}
        >
          Adult (Player)
        </button>
        <button
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === "fan" ? "bg-blue-600 text-white" : "hover:bg-gray-50"}`}
          onClick={() => setTab("fan")}
        >
          Adult (Fan)
        </button>
        <button
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === "kids" ? "bg-blue-600 text-white" : "hover:bg-gray-50"}`}
          onClick={() => setTab("kids")}
        >
          Kids
        </button>
      </div>

      {/* Tables */}
      <section className="space-y-6">
        {tab !== "kids" && adultData && (
          <>
            <SectionHeader title="Adult size chart (cm)" subtitle="Garment measurements" />
            <AdultTableView data={adultData} unit="cm" />

            <SectionHeader title="Adult size chart (inches)" />
            <AdultTableView data={adultData} unit="in" />
          </>
        )}

        {tab === "kids" && (
          <>
            <SectionHeader title="Kids size chart (cm)" subtitle="Jersey & shorts measurements" />
            <KidsTableView unit="cm" />

            <SectionHeader title="Kids size chart (inches)" />
            <KidsTableView unit="in" />
          </>
        )}
      </section>
    </main>
  );
}
