"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "@kmo/shared/auth";
import { getPlatformSettings } from "@kmo/shared/api";
import { SaleTagProvider } from "@kmo/shared/ui";
import { supabase } from "@/lib/supabase";
import { LanguageProvider } from "@/lib/i18n/language-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider supabase={supabase}>
          <SaleTagFromSettings>{children}</SaleTagFromSettings>
          <ReactQueryDevtools initialIsOpen={false} />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

/** The admin's sale tag shows only while product discounts are on. */
function SaleTagFromSettings({ children }: { children: React.ReactNode }) {
  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => getPlatformSettings(supabase),
  });
  const tag = settings?.product_discounts_enabled ? (settings.sale_tag_text ?? null) : null;
  return <SaleTagProvider tag={tag}>{children}</SaleTagProvider>;
}
