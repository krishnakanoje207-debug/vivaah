"use client";

import { useActionState } from "react";
import { saveBlock, deleteBlock, type ContentState } from "./actions";

const field =
  "w-full rounded-control border border-ink-900/20 bg-porcelain-50 px-3 py-2.5 text-body " +
  "text-ink-900 outline-none focus:border-violet-700";
const labelCls = "block text-caption font-medium text-ink-600 mb-1.5";

export type Block = { key: string; en: string; hi: string };

function Feedback({ state }: { state: ContentState }) {
  if (state.ok)
    return (
      <p role="status" className="text-caption text-success">
        Saved.
      </p>
    );
  if (state.error)
    return (
      <p role="alert" className="text-caption text-danger">
        {state.error}
      </p>
    );
  return null;
}

function BlockForm({ block }: { block?: Block }) {
  const [state, action, pending] = useActionState<ContentState, FormData>(saveBlock, {});
  const isNew = !block;
  const fe = state.fieldErrors ?? {};

  return (
    <section className="rounded-card border border-ink-900/10 bg-white p-6 shadow-card sm:p-7">
      <form action={action} className="flex flex-col gap-4">
        <div>
          <label htmlFor={`key-${block?.key ?? "new"}`} className={labelCls}>
            Block key
          </label>
          {isNew ? (
            <input
              id="key-new"
              name="key"
              placeholder="home.hero"
              className={`${field} tabular`}
            />
          ) : (
            <>
              <input type="hidden" name="key" value={block.key} />
              <p className="tabular font-display text-h3 text-ink-900">{block.key}</p>
            </>
          )}
          {isNew && fe.key && (
            <p role="alert" className="mt-1 text-caption text-danger">
              {fe.key}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`en-${block?.key ?? "new"}`} className={labelCls}>
              English
            </label>
            <textarea
              id={`en-${block?.key ?? "new"}`}
              name="en"
              rows={4}
              defaultValue={block?.en ?? ""}
              className={field}
            />
          </div>
          <div>
            <label htmlFor={`hi-${block?.key ?? "new"}`} className={labelCls}>
              Hindi
            </label>
            <textarea
              id={`hi-${block?.key ?? "new"}`}
              name="hi"
              rows={4}
              defaultValue={block?.hi ?? ""}
              className={`${field} font-sans-hi`}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="rounded-control bg-violet-800 px-5 py-2.5 text-body font-semibold text-porcelain-50 transition-colors hover:bg-violet-700 disabled:opacity-60"
          >
            {pending ? "Saving…" : isNew ? "Add block" : "Save"}
          </button>
          <Feedback state={state} />
        </div>
      </form>

      {!isNew && (
        <form action={deleteBlock} className="mt-4 border-t border-ink-900/10 pt-4">
          <input type="hidden" name="key" value={block.key} />
          <button
            type="submit"
            className="text-caption text-danger transition-colors hover:underline"
          >
            Delete this block
          </button>
        </form>
      )}
    </section>
  );
}

export function ContentEditor({ blocks }: { blocks: Block[] }) {
  return (
    <div className="mt-8 flex flex-col gap-6">
      <div>
        <h2 className="font-display text-h3 text-ink-900">Add a block</h2>
        <div className="mt-4">
          <BlockForm />
        </div>
      </div>

      <div>
        <h2 className="font-display text-h3 text-ink-900">
          Existing blocks{" "}
          <span className="text-caption text-ink-400">
            {blocks.length > 0 ? `(${blocks.length})` : ""}
          </span>
        </h2>
        {blocks.length === 0 ? (
          <div className="mt-4 rounded-card border border-dashed border-ink-900/15 bg-white/60 p-10 text-center">
            <p className="font-display text-h3 text-ink-900">No blocks yet</p>
            <p className="mx-auto mt-2 max-w-sm text-body text-ink-600">
              Add your first content block above. It becomes editable copy on the public site.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-6">
            {blocks.map((b) => (
              <BlockForm key={b.key} block={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
