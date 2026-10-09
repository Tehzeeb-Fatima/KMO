"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlatformSettings } from "@kmo/shared/api";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n/language-context";
import { ListSkeleton } from "@/components/page-loader";

/** Turns the admin-editable plain-text body into simple blocks: a line
 *  starting with "# " is a section heading, "- " is a bullet, a blank line
 *  separates paragraphs — a tiny convention an admin can type in a textarea
 *  without needing a rich text editor. */
function parseBody(body: string) {
  const blocks: { type: "heading" | "paragraph" | "list"; text?: string; items?: string[] }[] = [];
  const paragraphs = body.split(/\n\s*\n/);
  for (const para of paragraphs) {
    const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    if (lines.length === 1 && lines[0].startsWith("# ")) {
      blocks.push({ type: "heading", text: lines[0].slice(2) });
      continue;
    }
    if (lines.every((l) => l.startsWith("- "))) {
      blocks.push({ type: "list", items: lines.map((l) => l.slice(2)) });
      continue;
    }
    blocks.push({ type: "paragraph", text: lines.join(" ") });
  }
  return blocks;
}

export function VendorAgreementContent() {
  const { t } = useLanguage();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings-public"],
    queryFn: () => getPlatformSettings(supabase),
  });

  const blocks = settings ? parseBody(settings.vendor_agreement_body) : [];

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{t.footer.sell}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink">
        {settings?.vendor_agreement_title ?? "Vendor Rule Book & Seller Guidelines"}
      </h1>

      {isLoading ? (
        <div className="mt-6"><ListSkeleton rows={6} rowClassName="h-5" /></div>
      ) : (
        <div className="mt-6 flex flex-col gap-4 text-sm leading-[1.75] text-ink-dark">
          {blocks.map((b, i) => {
            if (b.type === "heading") {
              return (
                <h2 key={i} className="mt-2 text-base font-bold text-ink">
                  {b.text}
                </h2>
              );
            }
            if (b.type === "list") {
              return (
                <ul key={i} className="flex flex-col gap-1.5 pl-5" style={{ listStyle: "disc" }}>
                  {b.items!.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              );
            }
            return <p key={i}>{b.text}</p>;
          })}
        </div>
      )}
    </main>
  );
}
