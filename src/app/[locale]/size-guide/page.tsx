// src/app/size-guide/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

type Unit = "cm" | "in";

type Range = [number, number] | number;
type AdultRowKey = "Length" | "Width" | "Height" | "Weight";
type AdultSizeKey = "S" | "M" | "L" | "XL" | "2XL";
type AdultRows = Record<AdultRowKey, Partial<Record<AdultSizeKey, Range>>>;
type AdultTable = { sizes: AdultSizeKey[]; rows: AdultRows };

// ===== Adult (Fan) data in cm =====
const ADULT: AdultTable = {
  sizes: ["S", "M", "L", "XL", "2XL"],
  rows: {
    Length: {
      S: [69, 71],
      M: [71, 73],
      L: [73, 75],
      XL: [75, 78],
      "2XL": [78, 81],
    },
    Width: {
      S: [53, 55],
      M: [55, 57],
      L: [57, 58],
      XL: [58, 60],
      "2XL": [60, 62],
    },
    Height: {
      S: [162, 170],
      M: [170, 176],
      L: [176, 182],
      XL: [182, 190],
      "2XL": [190, 195],
    },
    Weight: {
      S: [50, 62],
      M: [62, 78],
      L: [78, 83],
      XL: [83, 90],
      "2XL": [90, 97],
    },
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
  { size: "#16", length: 43, bust: 32, height: [95, 105], age: "2–3", shortsLength: 32 },
  { size: "#18", length: 47, bust: 34, height: [105, 115], age: "3–4", shortsLength: 34 },
  { size: "#20", length: 50, bust: 36, height: [115, 125], age: "4–5", shortsLength: 36 },
  { size: "#22", length: 53, bust: 38, height: [125, 135], age: "6–7", shortsLength: 38 },
  { size: "#24", length: 56, bust: 40, height: [135, 145], age: "8–9", shortsLength: 39 },
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
      <h2 className="text-base font-semibold tracking-tight sm:text-lg md:text-xl">
        {title}
      </h2>
    </header>
  );
}

// ===== Adult table =====
function AdultTableView({ data, unit }: { data: AdultTable; unit: Unit }) {
  const t = useTranslations("sizeGuidePage");

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b bg-gray-50 px-3 py-2 text-xs sm:px-4 sm:text-sm md:px-6">
        {t("table.units")}{" "}
        <b>
          {unit === "cm" ? t("table.centimetres") : t("table.inches")}
        </b>
      </div>

      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <div className="min-w-[620px] px-4 sm:min-w-0 sm:px-0">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <colgroup>
              <col className="w-32 sm:w-40" />
              {data.sizes.map((_, i) => (
                <col key={i} />
              ))}
            </colgroup>

            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-3 py-2 text-center font-medium sm:px-4 sm:py-3 md:px-6">
                  {t("table.measurement")}
                </th>
                {data.sizes.map((s) => (
                  <th
                    key={s}
                    className="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium sm:px-4 sm:py-3 md:px-6"
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {(["Length", "Width", "Height", "Weight"] as AdultRowKey[]).map(
                (key, i) => (
                  <tr
                    key={key}
                    className={i % 2 ? "bg-white" : "bg-gray-50/40"}
                  >
                    <td className="border border-gray-300 px-3 py-2 text-center font-semibold sm:px-4 sm:py-3 md:px-6">
                      {t(`adult.rows.${key}`)}
                    </td>
                    {data.sizes.map((s) => (
                      <td
                        key={s}
                        className="whitespace-nowrap border border-gray-300 px-3 py-2 text-center sm:px-4 sm:py-3 md:px-6"
                      >
                        {renderRange(data.rows[key][s], unit)}
                      </td>
                    ))}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== Kids table =====
type KidsRowKey =
  | "Jersey length"
  | "Chest (bust)"
  | "Height"
  | "Shorts length";

type KidsTableShape = {
  sizes: string[];
  rows: Record<KidsRowKey, Partial<Record<string, Range>>>;
};

function makeKidsTable(t: ReturnType<typeof useTranslations>): KidsTableShape {
  const sizes = KIDS_ROWS.map((r) => t("kids.ageYears", { age: r.age }));

  const rows: KidsTableShape["rows"] = {
    "Jersey length": {},
    "Chest (bust)": {},
    Height: {},
    "Shorts length": {},
  };

  KIDS_ROWS.forEach((r) => {
    const key = t("kids.ageYears", { age: r.age });
    rows["Jersey length"][key] = r.length;
    rows["Chest (bust)"][key] = r.bust;
    rows["Height"][key] = [r.height[0], r.height[1]];
    rows["Shorts length"][key] = r.shortsLength;
  });

  return { sizes, rows };
}

function KidsTableView({ unit }: { unit: Unit }) {
  const t = useTranslations("sizeGuidePage");
  const data = useMemo(() => makeKidsTable(t), [t]);

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b bg-gray-50 px-3 py-2 text-xs sm:px-4 sm:text-sm md:px-6">
        {t("table.units")}{" "}
        <b>
          {unit === "cm" ? t("table.centimetres") : t("table.inches")}
        </b>
      </div>

      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <div className="min-w-[680px] px-4 sm:min-w-0 sm:px-0">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <colgroup>
              <col className="w-32 sm:w-40" />
              {data.sizes.map((_, i) => (
                <col key={i} />
              ))}
            </colgroup>

            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium sm:px-4 sm:py-3 md:px-6">
                  {t("table.measurement")}
                </th>
                {data.sizes.map((s) => (
                  <th
                    key={s}
                    className="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium sm:px-4 sm:py-3 md:px-6"
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {(
                [
                  "Jersey length",
                  "Chest (bust)",
                  "Height",
                  "Shorts length",
                ] as KidsRowKey[]
              ).map((rowKey, idx) => (
                <tr
                  key={rowKey}
                  className={idx % 2 ? "bg-white" : "bg-gray-50/40"}
                >
                  <td className="border border-gray-300 px-3 py-2 text-center font-semibold sm:px-4 sm:py-3 md:px-6">
                    {t(`kids.rows.${rowKey}`)}
                  </td>
                  {data.sizes.map((s) => (
                    <td
                      key={s}
                      className="whitespace-nowrap border border-gray-300 px-3 py-2 text-center sm:px-4 sm:py-3 md:px-6"
                    >
                      {renderRange(data.rows[rowKey][s], unit)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== Page =====
export default function SizeGuidePage() {
  const t = useTranslations("sizeGuidePage");
  const [tab, setTab] = useState<"adult" | "kids">("adult");
  const adultData = useMemo(() => (tab === "adult" ? ADULT : null), [tab]);

  return (
    <main className="container-fw mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:py-12">
      <nav className="mb-4 text-xs text-gray-500 sm:text-sm">
        <Link href="/" className="transition-colors hover:text-blue-700">
          {t("breadcrumb.home")}
        </Link>
        <span className="mx-1 sm:mx-2">/</span>
        <span className="font-medium text-gray-700">
          {t("breadcrumb.current")}
        </span>
      </nav>

      <header className="mb-5 sm:mb-6 md:mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
          {t("header.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
          {t.rich("header.description", {
            adult: (chunks) => <b>{chunks}</b>,
            kids: (chunks) => <b>{chunks}</b>,
            cm: (chunks) => <b>{chunks}</b>,
            inches: (chunks) => <b>{chunks}</b>,
          })}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <div className="inline-flex rounded-xl border bg-white p-1 shadow-sm">
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:text-sm ${
              tab === "adult"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setTab("adult")}
          >
            {t("tabs.adult")}
          </button>

          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:text-sm ${
              tab === "kids"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setTab("kids")}
          >
            {t("tabs.kids")}
          </button>
        </div>
      </div>

      <section className="space-y-6 md:space-y-8">
        {tab === "adult" && adultData && (
          <>
            <SectionHeader title={t("adult.sectionCm")} />
            <AdultTableView data={adultData} unit="cm" />

            <SectionHeader title={t("adult.sectionIn")} />
            <AdultTableView data={adultData} unit="in" />
          </>
        )}

        {tab === "kids" && (
          <>
            <SectionHeader title={t("kids.sectionCm")} />
            <KidsTableView unit="cm" />

            <SectionHeader title={t("kids.sectionIn")} />
            <KidsTableView unit="in" />
          </>
        )}
      </section>
    </main>
  );
}