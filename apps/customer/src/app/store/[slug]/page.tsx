import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import StoreClient from "./store-client";

async function fetchSeoData(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { data } = await supabase
    .from("vendors")
    .select("store_name, description")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await fetchSeoData(slug);

  if (!vendor) {
    return { title: "Store not found — Karachi Mart Online" };
  }

  const title = `${vendor.store_name} — Karachi Mart Online`;
  const description = vendor.description?.slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: `/store/${slug}` },
    openGraph: { title, description },
  };
}

export default function StorePage() {
  return <StoreClient />;
}
