"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { slugify } from "./helpers";
import { VariantsEditor } from "./VariantsEditor";
import {
  OCCASIONS,
  type CategoryOption,
  type FormState,
  type ProductFormValues,
  type ProductImage,
  type Section,
  type VariantRow,
} from "./types";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const fieldClass =
  "w-full rounded-control border border-ink-900/20 bg-porcelain-50 px-3 py-2.5 text-body " +
  "text-ink-900 outline-none focus:border-violet-700";
const labelClass = "block text-caption font-medium text-ink-600 mb-1.5";
const sectionClass = "rounded-card border border-ink-900/10 bg-white p-5 shadow-card md:p-6";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1 text-caption text-danger">
      {msg}
    </p>
  );
}

export function ProductForm({
  initial,
  categories,
  action,
}: {
  initial: ProductFormValues;
  categories: CategoryOption[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const errors = state.errors ?? {};

  const [type, setType] = useState<Section>(initial.type);
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugEdited, setSlugEdited] = useState(Boolean(initial.slug));
  const [categoryId, setCategoryId] = useState(initial.category_id ?? "");
  const [descEn, setDescEn] = useState(initial.description.en);
  const [descHi, setDescHi] = useState(initial.description.hi);
  const [occasions, setOccasions] = useState<string[]>(initial.occasions);
  const [images, setImages] = useState<ProductImage[]>(initial.images);
  const [isActive, setIsActive] = useState(initial.is_active);
  const [variants, setVariants] = useState<VariantRow[]>(initial.variants);

  // Spin
  const [spinOn, setSpinOn] = useState(Boolean(initial.spin));
  const [spinBase, setSpinBase] = useState(initial.spin?.basePath ?? "");
  const [spinFrames, setSpinFrames] = useState(initial.spin ? String(initial.spin.frames) : "");
  const [spinArc, setSpinArc] = useState(initial.spin ? String(initial.spin.arcDegrees) : "360");
  const [spinLoop, setSpinLoop] = useState(initial.spin?.loop ?? false);

  const catOptions = categories.filter((c) => c.section === type);

  function onNameChange(v: string) {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  }

  function onTypeChange(next: Section) {
    setType(next);
    // Category options change with type — drop a now-invalid selection.
    if (!categories.some((c) => c.id === categoryId && c.section === next)) setCategoryId("");
  }

  const spinJson =
    spinOn && spinBase.trim()
      ? JSON.stringify({
          basePath: spinBase.trim(),
          frames: Number(spinFrames) || 0,
          arcDegrees: Number(spinArc) || 360,
          loop: spinLoop,
        })
      : "";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="images_json" value={JSON.stringify(images)} />
      <input type="hidden" name="variants_json" value={JSON.stringify(variants)} />
      <input type="hidden" name="spin_json" value={spinJson} />

      {state.message && !state.ok && (
        <p role="alert" className="rounded-control bg-danger/10 px-4 py-3 text-caption text-danger">
          {state.message}
        </p>
      )}

      {/* Basics */}
      <div className={sectionClass}>
        <h2 className="mb-4 font-display text-h3 text-ink-900">Details</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="name" className={labelClass}>
              Name
            </label>
            <input
              id="name"
              name="name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className={fieldClass}
              required
            />
            <FieldError msg={errors.name} />
          </div>

          <div>
            <label htmlFor="slug" className={labelClass}>
              Slug <span className="text-ink-400">· web address</span>
            </label>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              className={`${fieldClass} tabular`}
            />
            <FieldError msg={errors.slug} />
          </div>

          <div>
            <span className={labelClass}>Type</span>
            <div className="flex gap-2">
              {(["rental", "retail"] as const).map((t) => (
                <label
                  key={t}
                  className={`flex-1 cursor-pointer rounded-control border px-4 py-2.5 text-center text-body capitalize transition-colors ${
                    type === t
                      ? "border-violet-800 bg-violet-100 text-violet-800"
                      : "border-ink-900/20 text-ink-600 hover:border-ink-900/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={type === t}
                    onChange={() => onTypeChange(t)}
                    className="sr-only"
                  />
                  {t}
                </label>
              ))}
            </div>
            <FieldError msg={errors.type} />
          </div>

          <div>
            <label htmlFor="category_id" className={labelClass}>
              Category
            </label>
            <select
              id="category_id"
              name="category_id"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={fieldClass}
            >
              <option value="">Choose a category…</option>
              {catOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError msg={errors.category_id} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="description_en" className={labelClass}>
                Description (English)
              </label>
              <textarea
                id="description_en"
                name="description_en"
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                rows={4}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="description_hi" className={labelClass}>
                Description (हिंदी) <span className="text-ink-400">· optional</span>
              </label>
              <textarea
                id="description_hi"
                name="description_hi"
                value={descHi}
                onChange={(e) => setDescHi(e.target.value)}
                rows={4}
                className={fieldClass}
              />
            </div>
          </div>

          {type === "rental" && (
            <div>
              <span className={labelClass}>Occasions</span>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((occ) => {
                  const on = occasions.includes(occ);
                  return (
                    <label
                      key={occ}
                      className={`cursor-pointer rounded-control border px-3 py-1.5 text-caption capitalize transition-colors ${
                        on
                          ? "border-violet-800 bg-violet-100 text-violet-800"
                          : "border-ink-900/20 text-ink-600 hover:border-ink-900/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="occasions"
                        value={occ}
                        checked={on}
                        onChange={(e) =>
                          setOccasions((prev) =>
                            e.target.checked ? [...prev, occ] : prev.filter((o) => o !== occ),
                          )
                        }
                        className="sr-only"
                      />
                      {occ}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2.5 text-body text-ink-600">
            <input
              type="checkbox"
              name="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-violet-800"
            />
            Active — visible on the website
          </label>
        </div>
      </div>

      {/* Pricing */}
      <div className={sectionClass}>
        <h2 className="mb-4 font-display text-h3 text-ink-900">Pricing</h2>
        {type === "rental" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="rental_price" className={labelClass}>
                Rental price (₹)
              </label>
              <input
                id="rental_price"
                name="rental_price"
                type="number"
                min={0}
                defaultValue={initial.rental_price ?? ""}
                className={`${fieldClass} tabular`}
              />
              <FieldError msg={errors.rental_price} />
            </div>
            <div>
              <label htmlFor="prebook_charge" className={labelClass}>
                Pre-book charge (₹)
              </label>
              <input
                id="prebook_charge"
                name="prebook_charge"
                type="number"
                min={0}
                defaultValue={initial.prebook_charge ?? ""}
                className={`${fieldClass} tabular`}
              />
              <FieldError msg={errors.prebook_charge} />
            </div>
            <div>
              <label htmlFor="extension_rate" className={labelClass}>
                Extension / day (₹) <span className="text-ink-400">· optional</span>
              </label>
              <input
                id="extension_rate"
                name="extension_rate"
                type="number"
                min={0}
                defaultValue={initial.extension_rate ?? ""}
                className={`${fieldClass} tabular`}
              />
              <FieldError msg={errors.extension_rate} />
            </div>
          </div>
        ) : (
          <div className="sm:max-w-xs">
            <label htmlFor="price" className={labelClass}>
              Sale price (₹)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              min={0}
              defaultValue={initial.price ?? ""}
              className={`${fieldClass} tabular`}
            />
            <FieldError msg={errors.price} />
          </div>
        )}
      </div>

      {/* Photos */}
      <div className={sectionClass}>
        <h2 className="mb-1 font-display text-h3 text-ink-900">Photos</h2>
        <p className="mb-4 text-caption text-ink-400">
          Photo upload arrives with cloud storage — enter existing paths for now.
        </p>
        <div className="flex flex-col gap-3">
          {images.map((img, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 h-14 w-14 shrink-0 overflow-hidden rounded-control border border-ink-900/10 bg-porcelain-100">
                {img.path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.path} alt="" aria-hidden="true" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                <input
                  value={img.path}
                  onChange={(e) =>
                    setImages(images.map((im, idx) => (idx === i ? { ...im, path: e.target.value } : im)))
                  }
                  placeholder="/rentals/example/front.webp"
                  className={`${fieldClass} tabular`}
                />
                <input
                  value={img.alt}
                  onChange={(e) =>
                    setImages(images.map((im, idx) => (idx === i ? { ...im, alt: e.target.value } : im)))
                  }
                  placeholder="Alt text"
                  className={fieldClass}
                />
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => {
                    const next = [...images];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    setImages(next);
                  }}
                  className="rounded border border-ink-900/15 px-2 text-ink-600 hover:bg-porcelain-200 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === images.length - 1}
                  onClick={() => {
                    const next = [...images];
                    [next[i + 1], next[i]] = [next[i], next[i + 1]];
                    setImages(next);
                  }}
                  className="rounded border border-ink-900/15 px-2 text-ink-600 hover:bg-porcelain-200 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                  className="rounded border border-danger/30 px-2 text-danger hover:bg-danger/5"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <div>
            <button
              type="button"
              onClick={() => setImages([...images, { path: "", alt: "" }])}
              className="rounded-control border border-violet-300 px-4 py-2 text-body text-violet-800 hover:bg-violet-100"
            >
              + Add photo
            </button>
          </div>
        </div>
      </div>

      {/* 360 view */}
      <div className={sectionClass}>
        <label className="flex items-center gap-2.5 text-h3 font-display text-ink-900">
          <input
            type="checkbox"
            checked={spinOn}
            onChange={(e) => setSpinOn(e.target.checked)}
            className="h-4 w-4 accent-violet-800"
          />
          360° view
        </label>
        {spinOn && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="spin_base" className={labelClass}>
                Frames base path
              </label>
              <input
                id="spin_base"
                value={spinBase}
                onChange={(e) => setSpinBase(e.target.value)}
                placeholder="/rentals/lahenga1/360"
                className={`${fieldClass} tabular`}
              />
            </div>
            <div>
              <label htmlFor="spin_frames" className={labelClass}>
                Frame count
              </label>
              <input
                id="spin_frames"
                type="number"
                min={1}
                value={spinFrames}
                onChange={(e) => setSpinFrames(e.target.value)}
                className={`${fieldClass} tabular`}
              />
            </div>
            <div>
              <label htmlFor="spin_arc" className={labelClass}>
                Arc degrees
              </label>
              <input
                id="spin_arc"
                type="number"
                min={1}
                max={360}
                value={spinArc}
                onChange={(e) => setSpinArc(e.target.value)}
                className={`${fieldClass} tabular`}
              />
            </div>
            <label className="flex items-center gap-2.5 text-body text-ink-600">
              <input
                type="checkbox"
                checked={spinLoop}
                onChange={(e) => setSpinLoop(e.target.checked)}
                className="h-4 w-4 accent-violet-800"
              />
              Loop (full 360° wrap)
            </label>
          </div>
        )}
        <FieldError msg={errors.spin} />
      </div>

      {/* Variants */}
      <div className={sectionClass}>
        <h2 className="mb-1 font-display text-h3 text-ink-900">Colours &amp; stock</h2>
        <p className="mb-4 text-caption text-ink-400">
          {type === "retail"
            ? "Retail items keep at least one colour — a default is added if you leave this empty."
            : "Add the colours this piece is available in."}
        </p>
        <VariantsEditor variants={variants} onChange={setVariants} error={errors.variants} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-control bg-violet-800 px-6 py-2.5 text-body font-semibold text-porcelain-50 transition-colors hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : initial.id ? "Save changes" : "Create product"}
        </button>
        <Link
          href="/admin/products"
          className="rounded-control border border-ink-900/20 px-6 py-2.5 text-body text-ink-600 transition-colors hover:border-ink-900/40 hover:text-ink-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
