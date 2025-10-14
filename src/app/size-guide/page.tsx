// src/app/size-guide/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Unit = "cm" | "in";

type Range = [number, number] | number;
type AdultRowKey = "Length" | "Width" | "Height" | "Weight";
type AdultSizeKey = "S" | "M" | "L" | "XL" | "2XL" | "3XL" | "4XL";
type AdultRows = Record<AdultRowKey, Partial<Record<AdultSizeKey, Range>>>;
type AdultTable = { sizes: AdultSizeKey[]; rows: AdultRows };

// ===== Adult (Fan) data in cm =====
const ADULT: AdultTable = {
  sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  rows: {
    Length: { S: [69, 71], M: [71, 73], L: [73, 75], XL: [75, 78], "2XL": [78, 81], "3XL": [81, 83], "4XL": [83, 85] },
    Width:  { S: [53, 55], M: [55, 57], L: [57, 58], XL: [58, 60], "2XL": [60, 62], "3XL": [62, 64], "4XL": [64, 65] },
    Height: { S: [162, 170], M: [170, 176], L: [176, 182], XL: [182, 190], "2XL": [190, 195], "3XL": [192, 197], "4XL": [197, 200] },
    Weight: { S: [50, 62], M: [62, 78], L: [78, 83], XL: [83, 90], "2XL": [90, 97], "3XL": [97, 104], "4XL": [104, 110] },
  },
};

// ===== Kids data in cm =====
type KidsRow = {
  size: string;
  length: number;
  bust: number;
  height: [number, number];
  age: string;
  shortsLength: number;
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

// ===== Helpers =====
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

function SectionHeader({ title }: { title: string }) {
  return (
    <header className="mb-3">
      <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
    </header>
  );
}

// ===== Tables =====
function AdultTableView({ data, unit }: { data: AdultTable; unit: Unit }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-2 bg-gray-50 border-b text-sm">
        Units: <b>{unit === "cm" ? "centimetres (cm)" : "inches (in)"}</b>
      </div>
      <div className="overflow-x-visible">
        <table className="w-full text-sm table-fixed border-collapse">
          <colgroup>
            <col className="w-40" />
            {data.sizes.map((_, i) => <col key={i} />)}
          </colgroup>
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 sm:px-6 py-3 font-medium border border-gray-200">Measurement</th>
              {data.sizes.map((s) => (
                <th key={s} className="text-left px-4 sm:px-6 py-3 font-medium border border-gray-200 bg-gray-50">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["Length", "Width", "Height", "Weight"] as AdultRowKey[]).map((key, i) => (
              <tr key={key} className={i % 2 ? "bg-white" : "bg-gray-50/40"}>
                <td className="px-4 sm:px-6 py-3 font-semibold border border-gray-200">{key}</td>
                {data.sizes.map((s) => (
                  <td key={s} className="px-4 sm:px-6 py-3 whitespace-nowrap border border-gray-200">
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
      <div className="overflow-x-visible">
        <table className="w-full text-sm table-fixed border-collapse">
          <colgroup>
            <col className="w-24" />
            <col />
            <col />
            <col />
            <col className="w-24" />
            <col />
          </colgroup>
          <thead className="bg-gray-50">
            <tr>
              {["Size","Jersey length","Chest (bust)","Height","Age","Shorts length"].map((h) => (
                <th key={h} className="text-left px-4 sm:px-6 py-3 font-medium border border-gray-200 bg-gray-50">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {KIDS_ROWS.map((r, i) => (
              <tr key={r.size} className={i % 2 ? "bg-white" : "bg-gray-50/40"}>
                <td className="px-4 sm:px-6 py-3 font-semibold border border-gray-200">{r.size}</td>
                <td className="px-4 sm:px-6 py-3 whitespace-nowrap border border-gray-200">
                  {unit === "cm" ? `${r.length} cm` : `${toInches(r.length)} in`}
                </td>
                <td className="px-4 sm:px-6 py-3 whitespace-nowrap border border-gray-200">
                  {unit === "cm" ? `${r.bust} cm` : `${toInches(r.bust)} in`}
                </td>
                <td className="px-4 sm:px-6 py-3 whitespace-nowrap border border-gray-200">
                  {unit === "cm"
                    ? `${r.height[0]}–${r.height[1]} cm`
                    : `${toInches(r.height[0])}–${toInches(r.height[1])} in`}
                </td>
                <td className="px-4 sm:px-6 py-3 whitespace-nowrap border border-gray-200">
                  {r.age} yrs
                </td>
                <td className="px-4 sm:px-6 py-3 whitespace-nowrap border border-gray-200">
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

// ===== Page =====
export default function SizeGuidePage() {
  const [tab, setTab] = useState<"adult" | "kids">("adult");
  const adultData = useMemo(() => (tab === "adult" ? ADULT : null), [tab]);

  return (
    <main className="container-fw max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-blue-700">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700 font-medium">Size Guide</span>
      </nav>

      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Size Guide</h1>
        <p className="mt-2 text-gray-600">
          Choose between <b>Adult</b> and <b>Kids</b>. Each section shows tables in <b>cm</b> and <b>inches</b>.
        </p>
      </header>

      <div className="mb-5 inline-flex rounded-xl border p-1 bg-white shadow-sm">
        <button
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === "adult" ? "bg-blue-600 text-white" : "hover:bg-gray-50"}`}
          onClick={() => setTab("adult")}
        >
          Adult
        </button>
        <button
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === "kids" ? "bg-blue-600 text-white" : "hover:bg-gray-50"}`}
          onClick={() => setTab("kids")}
        >
          Kids
        </button>
      </div>

      <section className="space-y-6">
        {tab === "adult" && adultData && (
          <>
            <SectionHeader title="Adult size chart (cm)" />
            <AdultTableView data={adultData} unit="cm" />

            <SectionHeader title="Adult size chart (inches)" />
            <AdultTableView data={adultData} unit="in" />
          </>
        )}

        {tab === "kids" && (
          <>
            <SectionHeader title="Kids size chart (cm)" />
            <KidsTableView unit="cm" />

            <SectionHeader title="Kids size chart (inches)" />
            <KidsTableView unit="in" />
          </>
        )}
      </section>
    </main>
  );
}
