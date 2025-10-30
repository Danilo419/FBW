"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

/* ====================== Tipos ====================== */
type Props = {
  /** Nome do campo hidden enviado no submit (ex.: "imagesText") */
  name: string;
  /** Lista inicial de URLs vindas da BD */
  initialImages: string[];
  /** Alt do produto para acessibilidade (opcional) */
  alt?: string;
};

/* ====================== Utils ====================== */
function norm(u: string) {
  return (u ?? "").trim();
}
function uniqueMerge(base: string[], add: string[]) {
  const set = new Set(base.map(norm).filter(Boolean));
  add.forEach((u) => {
    const t = norm(u);
    if (t && !set.has(t)) set.add(t);
  });
  return Array.from(set);
}
function linesToArray(v: string) {
  return (v ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}
function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/* =================================================== */
export default function ImagesEditor({ name, initialImages, alt }: Props) {
  const [images, setImages] = useState<string[]>(
    () => (initialImages ?? []).filter(Boolean)
  );
  const [newUrl, setNewUrl] = useState("");
  const hiddenRef = useRef<HTMLInputElement | null>(null);
  const dragIndex = useRef<number | null>(null);

  const joined = useMemo(() => images.join("\n"), [images]);

  /* ---------- Sincroniza o hidden quando o estado muda ---------- */
  useEffect(() => {
    const el = hiddenRef.current;
    if (!el) return;
    // Evita loops: só atualiza se o valor mudou de facto
    if (el.value !== joined) {
      el.value = joined;
      // dispara eventos caso alguém esteja a observar
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, [joined]);

  /* ---------- Ouve alterações externas ao hidden (scripts) ---------- */
  useEffect(() => {
    const el = hiddenRef.current;
    if (!el) return;

    const syncFromHidden = () => {
      const arr = linesToArray(el.value);
      if (!arraysEqual(arr, images)) setImages(arr);
    };

    el.addEventListener("input", syncFromHidden);
    el.addEventListener("change", syncFromHidden);

    return () => {
      el.removeEventListener("input", syncFromHidden);
      el.removeEventListener("change", syncFromHidden);
    };
  }, [images]);

  /* ---------- API global opcional para integrações ---------- */
  useEffect(() => {
    const w = window as any;
    w.__imagesEditor = w.__imagesEditor || {};
    const api = {
      append: (urls: string[]) =>
        setImages((prev) => uniqueMerge(prev, urls || [])),
      replace: (urls: string[]) => setImages((urls || []).map(norm).filter(Boolean)),
      get: () => images.slice(),
    };
    w.__imagesEditor[name] = api;

    // Cleanup ao desmontar
    return () => {
      if (w.__imagesEditor && w.__imagesEditor[name]) {
        delete w.__imagesEditor[name];
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, images]);

  /* ---------- Ações locais ---------- */
  function addUrl() {
    const url = newUrl.trim();
    if (!url) return;
    setImages((prev) => uniqueMerge(prev, [url]));
    setNewUrl("");
  }

  function removeAt(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onDragStart(i: number) {
    dragIndex.current = i;
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); // Necessário para permitir drop
  }

  function onDrop(i: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === i) return;
    setImages((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(i, 0, moved);
      return arr;
    });
  }

  function move(i: number, delta: number) {
    setImages((prev) => {
      const arr = [...prev];
      const j = i + delta;
      if (j < 0 || j >= arr.length) return arr;
      const [moved] = arr.splice(i, 1);
      arr.splice(j, 0, moved);
      return arr;
    });
  }

  function updateAt(i: number, url: string) {
    setImages((prev) => prev.map((v, idx) => (idx === i ? url : v)));
  }

  return (
    <div className="space-y-3">
      {/* Campo hidden sincronizado para o submit do form */}
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        value={joined}
        readOnly
        data-editor-name={name}
      />

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Images</h3>
        <span className="text-xs text-gray-500">
          First image = main thumbnail
        </span>
      </div>

      {/* Grid de previews com drag-and-drop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {images.map((url, idx) => (
          <div
            key={url + idx}
            className="group relative rounded-xl border bg-gray-50 overflow-hidden"
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(idx)}
            title={url}
          >
            <div className="relative aspect-square">
              {url ? (
                <Image
                  src={url}
                  alt={alt ? `${alt} image ${idx + 1}` : `Image ${idx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                  No image
                </div>
              )}
              {idx === 0 && (
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Main
                </span>
              )}
            </div>

            {/* Barra de ações (aparece ao passar o rato) */}
            <div className="absolute inset-x-0 bottom-0 flex gap-1 p-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                className="rounded-md border border-white/30 bg-white/20 px-2 py-1 text-[10px] text-white hover:bg-white/30"
                aria-label="Move left"
                title="Move left"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => move(idx, +1)}
                className="rounded-md border border-white/30 bg-white/20 px-2 py-1 text-[10px] text-white hover:bg-white/30"
                aria-label="Move right"
                title="Move right"
              >
                →
              </button>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="ml-auto rounded-md border border-red-300 bg-red-600/80 px-2 py-1 text-[10px] text-white hover:bg-red-600"
                aria-label="Remove"
                title="Remove"
              >
                Remove
              </button>
            </div>

            {/* Input inline para editar a URL */}
            <div className="p-2 border-t bg-white">
              <input
                value={url}
                onChange={(e) => updateAt(idx, e.target.value)}
                className="w-full rounded-lg border px-2 py-1 text-xs font-mono"
                placeholder="https://…/image.jpg"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Adicionar nova URL (pode ser ocultado por CSS na página, se quiseres) */}
      <div className="flex gap-2">
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className="flex-1 rounded-xl border px-3 py-2 text-sm font-mono"
          placeholder="Paste an image URL and click Add"
        />
        <button
          type="button"
          onClick={addUrl}
          className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Add
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Reorder by dragging, by the arrow buttons, or by editing URLs directly.
        The first image is used as the main thumbnail in listings.
      </p>
    </div>
  );
}
