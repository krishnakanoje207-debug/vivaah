"use client";

import { useState } from "react";
import { QUICK_SIZES, type VariantRow } from "./types";
import { totalStock } from "./helpers";

const fieldClass =
  "w-full rounded-control border border-ink-900/20 bg-porcelain-50 px-3 py-2 text-body " +
  "text-ink-900 outline-none focus:border-violet-700";

type Props = {
  variants: VariantRow[];
  onChange: (next: VariantRow[]) => void;
  error?: string;
};

export function VariantsEditor({ variants, onChange, error }: Props) {
  const update = (i: number, patch: Partial<VariantRow>) =>
    onChange(variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  const remove = (i: number) => onChange(variants.filter((_, idx) => idx !== i));

  const addVariant = () =>
    onChange([
      ...variants,
      { colour_name: "", colour_hex: "#6b21a8", stock: {}, price_override: null, is_active: true },
    ]);

  const setStock = (i: number, size: string, count: number) =>
    update(i, { stock: { ...variants[i].stock, [size]: count } });

  const addSize = (i: number, size: string) => {
    const key = size.trim();
    if (!key || variants[i].stock[key] != null) return;
    update(i, { stock: { ...variants[i].stock, [key]: 1 } });
  };

  const removeSize = (i: number, size: string) => {
    const next = { ...variants[i].stock };
    delete next[size];
    update(i, { stock: next });
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}

      {variants.length === 0 && (
        <p className="text-caption text-ink-400">
          No colours yet. Retail items get a default colour automatically if you leave this empty.
        </p>
      )}

      {variants.map((v, i) => (
        <div
          key={i}
          className={`rounded-card border p-4 ${
            v.is_active ? "border-ink-900/10 bg-porcelain-50" : "border-ink-900/10 bg-porcelain-100 opacity-70"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* Colour */}
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-caption text-ink-600">Colour name</label>
                  <input
                    value={v.colour_name}
                    onChange={(e) => update(i, { colour_name: e.target.value })}
                    placeholder="e.g. Sage green"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-caption text-ink-600">Swatch</label>
                  <input
                    type="color"
                    aria-label="Colour swatch"
                    value={/^#[0-9A-Fa-f]{6}$/.test(v.colour_hex) ? v.colour_hex : "#6b21a8"}
                    onChange={(e) => update(i, { colour_hex: e.target.value })}
                    className="h-[42px] w-12 cursor-pointer rounded-control border border-ink-900/20 bg-porcelain-50"
                  />
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-caption text-ink-600">Hex</label>
                  <input
                    value={v.colour_hex}
                    onChange={(e) => update(i, { colour_hex: e.target.value })}
                    placeholder="#a1b2c3"
                    className={`${fieldClass} tabular`}
                  />
                </div>
              </div>

              {/* Stock by size */}
              <div>
                <label className="mb-1 block text-caption text-ink-600">
                  Stock by size{" "}
                  <span className="text-ink-400">· {totalStock(v.stock)} total</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {Object.entries(v.stock).map(([size, count]) => (
                    <span
                      key={size}
                      className="inline-flex items-center gap-1.5 rounded-control border border-ink-900/15 bg-white px-2 py-1"
                    >
                      <span className="text-caption text-ink-600">{size}</span>
                      <input
                        type="number"
                        min={0}
                        value={count}
                        onChange={(e) => setStock(i, size, Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                        className="w-14 rounded border border-ink-900/15 bg-porcelain-50 px-1.5 py-0.5 text-caption text-ink-900 outline-none focus:border-violet-700 tabular"
                      />
                      <button
                        type="button"
                        onClick={() => removeSize(i, size)}
                        aria-label={`Remove size ${size}`}
                        className="text-ink-400 hover:text-danger"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {QUICK_SIZES.filter((s) => v.stock[s] == null).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSize(i, s)}
                      className="rounded-control border border-violet-300 px-2 py-0.5 text-caption text-violet-800 hover:bg-violet-100"
                    >
                      + {s}
                    </button>
                  ))}
                  <CustomSize onAdd={(size) => addSize(i, size)} />
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="flex w-full flex-col gap-3 sm:w-40">
              <div>
                <label className="mb-1 block text-caption text-ink-600">Price override</label>
                <input
                  type="number"
                  min={0}
                  value={v.price_override ?? ""}
                  onChange={(e) =>
                    update(i, { price_override: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  placeholder="optional"
                  className={`${fieldClass} tabular`}
                />
              </div>
              <label className="flex items-center gap-2 text-caption text-ink-600">
                <input
                  type="checkbox"
                  checked={v.is_active}
                  onChange={(e) => update(i, { is_active: e.target.checked })}
                  className="h-4 w-4 accent-violet-800"
                />
                Active
              </label>
              <button
                type="button"
                onClick={() => remove(i)}
                className="mt-auto rounded-control border border-danger/40 px-3 py-1.5 text-caption text-danger hover:bg-danger/5"
              >
                Remove colour
              </button>
            </div>
          </div>
        </div>
      ))}

      <div>
        <button
          type="button"
          onClick={addVariant}
          className="rounded-control border border-violet-300 px-4 py-2 text-body text-violet-800 hover:bg-violet-100"
        >
          + Add colour
        </button>
      </div>
    </div>
  );
}

// Not a <form> — this editor is nested inside the product <form>, and forms
// cannot nest. Uses local state + an explicit add handler instead.
function CustomSize({ onAdd }: { onAdd: (size: string) => void }) {
  const [value, setValue] = useState("");
  const submit = () => {
    onAdd(value);
    setValue("");
  };
  return (
    <span className="inline-flex items-center gap-1">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="custom"
        className="w-20 rounded-control border border-ink-900/20 bg-porcelain-50 px-2 py-0.5 text-caption text-ink-900 outline-none focus:border-violet-700"
      />
      <button type="button" onClick={submit} className="text-caption text-violet-800 hover:underline">
        add
      </button>
    </span>
  );
}
