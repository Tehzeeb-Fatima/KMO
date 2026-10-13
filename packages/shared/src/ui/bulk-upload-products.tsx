import { useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";
import { bulkCreateProductsFromCsv, buildProductTemplateCsv } from "../api/products";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** "Download reference file" + "Bulk upload" for products, shared by the
 *  admin and vendor dashboards. Creates one product per valid CSV row,
 *  skipping and reporting bad rows rather than failing the whole file. */
export function BulkUploadProducts({
  supabase,
  vendorId,
  categories,
  onUploaded,
}: {
  supabase: SupabaseClient<Database>;
  vendorId: string;
  categories: CategoryRow[];
  onUploaded?: () => void;
}) {

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);

  function handleDownloadTemplate() {
    downloadTextFile("kmo-products-template.csv", buildProductTemplateCsv(categories));
  }

  async function handleFileChosen(file: File) {
    setUploading(true);
    setResult(null);
    try {
      const text = await file.text();
      const outcome = await bulkCreateProductsFromCsv(supabase, vendorId, text);
      setResult(outcome);
      if (outcome.created > 0) onUploaded?.();
    } catch (err) {
      setResult({ created: 0, errors: [{ row: 0, message: err instanceof Error ? err.message : "Upload failed." }] });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-[18px_20px]">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <p className="text-[14px] font-bold text-ink">Bulk upload products</p>
          <p className="text-[12px] text-muted">
            Download the reference file, fill in your products (a sample row shows the format), then upload it back.
            The category column must be one of the categories already assigned to this store — the reference file
            only lists those. New products are created as pending review unless they have no photos, in which case
            they&rsquo;re saved as a draft until you add some.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="rounded-lg border border-border bg-white px-[14px] py-[9px] text-[12.5px] font-bold text-ink-dark"
          >
            Download reference file
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-accent px-[14px] py-[9px] text-[12.5px] font-bold text-white disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Bulk upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileChosen(file);
            }}
          />
        </div>
      </div>

      {result ? (
        <div className="rounded-lg bg-surface-alt p-3 text-[12.5px]">
          <p className="font-semibold text-ink-dark">
            {result.created} product{result.created === 1 ? "" : "s"} created
            {result.errors.length > 0 ? `, ${result.errors.length} row${result.errors.length === 1 ? "" : "s"} skipped` : ""}.
          </p>
          {result.errors.length > 0 ? (
            <ul className="mt-1.5 flex flex-col gap-0.5 text-muted-table">
              {result.errors.slice(0, 20).map((e, i) => (
                <li key={i}>
                  {e.row > 0 ? `Row ${e.row}: ` : ""}
                  {e.message}
                </li>
              ))}
              {result.errors.length > 20 ? <li>…and {result.errors.length - 20} more.</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
