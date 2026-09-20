import { useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCategory,
  deleteCategory,
  listCategories,
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
              <button
                type="button"
                onClick={() => setPendingDelete({ id: c.id, name: c.name })}
                className="shrink-0 text-xs font-bold text-danger"
              >
                Remove
              </button>
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
