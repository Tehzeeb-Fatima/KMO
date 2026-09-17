import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCategory, deleteCategory, listCategories } from "@kmo/shared/api";
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(supabase, id),
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
              className="flex items-center justify-between border-t border-[#F5F0EE] px-5 py-3.5 text-[13px] first:border-t-0"
            >
              <span className="font-bold text-ink-dark">{c.name}</span>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(c.id)}
                className="text-xs font-bold text-danger"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
