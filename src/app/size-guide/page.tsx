// src/app/size-guide/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Metadata } from "next";

// Opcional (só funciona em Server Components):
// export const metadata: Metadata = {
//   title: "Size Guide | FootballWorld",
//   description: "Find your perfect fit. Adult, Women and Kids football jerseys size charts with cm/in conversion and measurement tips.",
// };

type Unit = "cm" | "in";

type SizeRow = {
  size: string;
  chestCircumference: [number, number]; // cm
  bodyLength: [number, number];         // cm
};

const MEN_ROWS: SizeRow[] = [
  { size: "XS",  chestCircumference: [84, 89],  bodyLength: [66, 68] },
  { size: "S",   chestCircumference: [89, 94],  bodyLength: [68, 70] },
  { size: "M",   chestCircumference: [94, 99],  bodyLength: [70, 72] },
  { size: "L",   chestCircumference: [99, 104], bodyLength: [72, 74] },
  { size: "XL",  chestCircumference: [104, 109], bodyLength: [74, 76] },
  { size: "2XL", chestCircumference: [109, 114], bodyLength: [76, 78] },
  { size: "3XL", chestCircumference: [114, 120], bodyLength: [78, 80] },
];

const WOMEN_ROWS: SizeRow[] = [
  { size: "XS",  chestCircumference: [76, 82],  bodyLength: [60, 62] },
  { size: "S",   chestCircumference: [82, 88],  bodyLength: [62, 64] },
  { size: "M",   chestCircumference: [88, 94],  bodyLength: [64, 66] },
  { size: "L",   chestCircumference: [94, 100], bodyLength: [66, 68] },
  { size: "XL",  chestCircumference: [100, 106], bodyLength: [68, 70] },
  { size: "2XL", chestCircumference: [106, 112], bodyLength: [70, 72] },
];

const KIDS_ROWS: SizeRow[] = [
  { size: "4-5Y", chestCircumference: [54, 58], bodyLength: [44, 48] },
  { size: "6-7Y", chestCircumference: [58, 62], bodyLength: [48, 52] },
  { size: "8-9Y", chestCircumference: [62, 66], bodyLength: [52, 56] },
  { size: "10-11Y", chestCircumference: [66, 72], bodyLength: [56, 60] },
  { size: "12-13Y", chestCircumference: [72, 78], bodyLength: [60, 64] },
  { size: "14-15Y", chestCircumference: [78, 84], bodyLength: [64, 68] },
];

function toUnit(v: number, unit: Unit) {
  return unit === "cm" ? v : +(v / 2.54).toFixed(1);
}

function Range({ value, unit }: { value: [number, number]; unit: Unit }) {
  const [a, b] = value;
  return (
    <span>
      {toUnit(a, unit)}–{toUnit(b, unit)} {unit}
    </span>
  );
}

function SizeTable({
  title,
  rows,
  unit,
}: {
  title: string;
  rows: SizeRow[];
  unit: Unit;
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
        <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 sm:px-6 py-3 font-medium">Size</th>
              <th className="text-left px-4 sm:px-6 py-3 font-medium">
                Chest circumference
              </th>
              <th className="text-left px-4 sm:px-6 py-3 font-medium">
                Body length
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.size}
                className={i % 2 ? "bg-white" : "bg-gray-50/40"}
              >
                <td className="px-4 sm:px-6 py-3 font-semibold">{r.size}</td>
                <td className="px-4 sm:px-6 py-3">
                  <Range value={r.chestCircumference} unit={unit} />
                </td>
                <td className="px-4 sm:px-6 py-3">
                  <Range value={r.bodyLength} unit={unit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 sm:px-6 py-3 text-xs text-gray-500 border-t">
        * Medidas referem-se à camisola deitada numa superfície plana e
        representam intervalos aproximados de fabrico. Pequenas variações são
        normais.
      </p>
    </div>
  );
}

export default function SizeGuidePage() {
  const [unit, setUnit] = useState<Unit>("cm");
  const [tab, setTab] = useState<"men" | "women" | "kids">("men");

  const rows = useMemo(() => {
    if (tab === "women") return WOMEN_ROWS;
    if (tab === "kids") return KIDS_ROWS;
    return MEN_ROWS;
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
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Size Guide
        </h1>
        <p className="mt-2 text-gray-600">
          Encontra o teu tamanho perfeito. Converte entre <b>cm</b> e{" "}
          <b>inches</b> e segue as dicas de medição abaixo.
        </p>
      </header>

      {/* Unit & Tabs */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border p-1 bg-white shadow-sm">
          <button
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              tab === "men" ? "bg-blue-600 text-white" : "hover:bg-gray-50"
            }`}
            onClick={() => setTab("men")}
          >
            Adult (Men)
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              tab === "women" ? "bg-blue-600 text-white" : "hover:bg-gray-50"
            }`}
            onClick={() => setTab("women")}
          >
            Women
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              tab === "kids" ? "bg-blue-600 text-white" : "hover:bg-gray-50"
            }`}
            onClick={() => setTab("kids")}
          >
            Kids
          </button>
        </div>

        <div className="inline-flex rounded-xl border p-1 bg-white shadow-sm">
          <button
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              unit === "cm" ? "bg-cyan-600 text-white" : "hover:bg-gray-50"
            }`}
            onClick={() => setUnit("cm")}
            aria-pressed={unit === "cm"}
          >
            cm
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              unit === "in" ? "bg-cyan-600 text-white" : "hover:bg-gray-50"
            }`}
            onClick={() => setUnit("in")}
            aria-pressed={unit === "in"}
          >
            inches
          </button>
        </div>
      </div>

      {/* Tables */}
      <section className="space-y-6">
        <SizeTable
          title={
            tab === "men"
              ? "Adult (Men) — Jerseys"
              : tab === "women"
              ? "Women — Jerseys"
              : "Kids — Jerseys"
          }
          rows={rows}
          unit={unit}
        />
      </section>

      {/* How to measure */}
      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-3">Como medir</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
            <li>
              <b>Peito (Chest):</b> mede à volta da parte mais larga do peito,
              mantendo a fita horizontal e relaxada (não demasiado justa).
            </li>
            <li>
              <b>Comprimento (Body Length):</b> da parte mais alta do ombro até
              ao fundo da camisola.
            </li>
            <li>
              <b>Ajuste desejado:</b> se queres um look mais{" "}
              <i>slim</i>, escolhe o intervalo inferior; para um look mais{" "}
              <i>relaxed</i>, o superior.
            </li>
          </ol>

          {/* pequeno diagrama SVG */}
          <div className="mt-5 grid place-items-center">
            <svg
              viewBox="0 0 220 220"
              className="w-56 h-56 text-gray-700"
              role="img"
              aria-label="Measurement diagram"
            >
              <rect x="55" y="35" width="110" height="150" rx="14" fill="none" stroke="currentColor" strokeWidth="2"/>
              {/* chest line */}
              <line x1="55" y1="95" x2="165" y2="95" stroke="currentColor" strokeWidth="2"/>
              <text x="110" y="88" textAnchor="middle" fontSize="10" fill="currentColor">Chest</text>
              {/* length line */}
              <line x1="175" y1="35" x2="175" y2="185" stroke="currentColor" strokeWidth="2"/>
              <text x="178" y="110" transform="rotate(-90 178,110)" textAnchor="middle" fontSize="10" fill="currentColor">Body Length</text>
            </svg>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-3">Dicas rápidas</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✔ Se estiveres entre dois tamanhos, considera subir um.</li>
            <li>✔ Lembra-te de que peças personalizadas podem ter ajuste ligeiramente diferente.</li>
            <li>✔ Lava a peça do avesso e segue a etiqueta para manter o caimento.</li>
            <li>✔ As medidas correspondem à peça, não ao corpo.</li>
          </ul>
          <div className="mt-4 text-xs text-gray-500">
            Última atualização: {new Date().toLocaleDateString("pt-PT")}
          </div>
        </div>
      </section>

      {/* FAQ simples */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-3">Perguntas frequentes</h2>
        <div className="space-y-3">
          <details className="rounded-xl border bg-white shadow-sm p-4">
            <summary className="cursor-pointer font-medium">As medidas são iguais para todas as marcas?</summary>
            <p className="mt-2 text-sm text-gray-700">
              São <b>genéricas</b> e baseadas no nosso fornecedor. Pequenas variações podem ocorrer entre
              coleções. Se já tens uma camisola que gostes, mede-a e compara com a tabela.
            </p>
          </details>
          <details className="rounded-xl border bg-white shadow-sm p-4">
            <summary className="cursor-pointer font-medium">Como escolho o tamanho para Kids?</summary>
            <p className="mt-2 text-sm text-gray-700">
              Usa a idade como referência inicial e confirma com as medidas de peito/comprimento. Crianças
              crescem rápido — se estiver no limite, sobe um tamanho.
            </p>
          </details>
          <details className="rounded-xl border bg-white shadow-sm p-4">
            <summary className="cursor-pointer font-medium">Posso trocar se não servir?</summary>
            <p className="mt-2 text-sm text-gray-700">
              Sim, segue a nossa política de trocas/devoluções. Peças <i>personalizadas</i> podem ter restrições.
            </p>
          </details>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-12 flex items-center justify-center">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow"
        >
          Ver produtos
        </Link>
      </section>
    </main>
  );
}
