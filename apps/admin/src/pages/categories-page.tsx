import { useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CATEGORY_ICONS, type CategoryIconKey } from "@kmo/shared/lib";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategoryIcon,
  updateCategoryHomepage,
  uploadCategoryImage,
  updateCategoryImage,
} from "@kmo/shared/api";
import { ConfirmDialog } from "@kmo/shared/ui";
import { supabase } from "../lib/supabase";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(supabase),
  });

  const [name, setName] = useState("");

  const addMutation = useMutation({
    mutationFn: () => createCategory(supabase, name, slugify(name)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setName("");
    },
  });

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setPendingDelete(null);
    },
  });

  const iconMutation = useMutation({
    mutationFn: (p: { id: string; icon: string }) => updateCategoryIcon(supabase, p.id, p.icon),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const homepageMutation = useMutation({
    mutationFn: (p: { id: string; show_on_homepage: boolean; homepage_order: number }) =>
      updateCategoryHomepage(supabase, p.id, {
        show_on_homepage: p.show_on_homepage,
        homepage_order: p.homepage_order,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const imageMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const url = await uploadCategoryImage(supabase, id, file);
      return updateCategoryImage(supabase, id, url);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  return (
    <div className="max-w-[640px]">
      <div className="mb-4 flex gap-2">
        <input
          placeholder="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-border px-[14px] py-[10px] text-[13px] outline-none focus:border-primary-light"
        />
        <button
          type="button"
          disabled={!name.trim() || addMutation.isPending}
          onClick={() => addMutation.mutate()}
          className="rounded-lg bg-accent px-[18px] py-[10px] text-[13px] font-bold text-white disabled:opacity-60"
        >
          + Add category
        </button>
      </div>

      <p className="mb-2 text-[12px] text-muted">
        Tick &ldquo;Homepage&rdquo; to show a product section for that category on the homepage. Lower
        numbers appear first. Pick as many as you want.
      </p>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {isLoading ? (
          <p className="p-5 text-sm text-muted">Loading…</p>
        ) : (
          categories?.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 border-t border-[#F5F0EE] px-5 py-3.5 text-[13px] first:border-t-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <CategoryImageBox
                  imageUrl={c.image_url}
                  uploading={imageMutation.isPending && imageMutation.variables?.id === c.id}
                  onChange={(file) => imageMutation.mutate({ id: c.id, file })}
                />
                <span className="truncate font-bold text-ink-dark">{c.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dangerouslySetInnerHTML={{
                      __html: CATEGORY_ICONS[(c.icon as CategoryIconKey) in CATEGORY_ICONS ? (c.icon as CategoryIconKey) : "tag"].paths,
                    }}
                  />
                </span>
                <select
                  aria-label="Category icon"
                  value={c.icon ?? "tag"}
                  onChange={(e) => iconMutation.mutate({ id: c.id, icon: e.target.value })}
                  className="rounded-md border border-border px-2 py-1 text-[12px] text-ink-dark"
                >
                  {(Object.keys(CATEGORY_ICONS) as CategoryIconKey[]).map((key) => (
                    <option key={key} value={key}>
                      {CATEGORY_ICONS[key].label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-dark">
                  <input
                    type="checkbox"
                    checked={c.show_on_homepage}
                    onChange={(e) =>
                      homepageMutation.mutate({
                        id: c.id,
                        show_on_homepage: e.target.checked,
                        homepage_order: c.homepage_order,
                      })
                    }
                  />
                  Homepage
                </label>
                <input
                  type="number"
                  aria-label="Homepage order"
                  defaultValue={c.homepage_order}
                  key={`${c.id}-${c.homepage_order}`}
                  onBlur={(e) => {
                    const order = Number(e.target.value) || 0;
                    if (order !== c.homepage_order) {
                      homepageMutation.mutate({
                        id: c.id,
                        show_on_homepage: c.show_on_homepage,
                        homepage_order: order,
                      });
                    }
                  }}
                  className="w-16 rounded-md border border-border px-2 py-1 text-[12px] outline-none focus:border-primary-light"
                />
                <button
                  type="button"
                  onClick={() => setPendingDelete({ id: c.id, name: c.name })}
                  className="text-xs font-bold text-danger"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Remove "${pendingDelete?.name}"?`}
        message="Vendors assigned to this category and products in it will lose that category."
        confirmLabel="Remove"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(pendingDelete!.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function CategoryImageBox({
  imageUrl,
  uploading,
  onChange,
}: {
  imageUrl: string | null;
  uploading?: boolean;
  onChange: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onChange(file);
    e.target.value = "";
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      title="Upload category image"
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-surface-alt bg-cover bg-center text-[9px] font-semibold text-muted-table disabled:opacity-60"
      style={imageUrl ? { backgroundImage: `url(${imageUrl})`, borderStyle: "solid" } : undefined}
    >
      {!imageUrl && (uploading ? "…" : "+ Img")}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </button>
  );
}
