"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

type Props = {
  /** Nome do campo hidden enviado no submit (ex.: "imagesText") */
  name: string;
  /** Lista inicial de URLs vindas da BD */
  initialImages: string[];
  /** Alt do produto para acessibilidade (opcional) */
  alt?: string;
};

export default function ImagesEditor({ name, initialImages, alt }: Props) {
  const [images, setImages] = useState<string[]>(
    () => (initialImages ?? []).filter(Boolean)
  );
  const [newUrl, setNewUrl] = useState("");
  const dragIndex = useRef<number | null>(null);

  const joined = useMemo(() => images.join("\n"), [images]);

  function addUrl() {
    const url = newUrl.trim();
    if (!url) return;
    setImages((prev) => [...prev, url]);
    setNewUrl("");
  }

  function removeAt(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onDragStart(i: number) {
    dragIndex.current = i;
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    // Necessário para permitir drop
    e.preventDefault();
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
      <input type="hidden" name={name} value={joined} readOnly />

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

      {/* Adicionar nova URL */}
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
