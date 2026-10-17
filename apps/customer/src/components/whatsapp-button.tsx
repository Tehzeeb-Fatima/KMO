"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlatformSettings } from "@kmo/shared/api";
import { supabase } from "@/lib/supabase";

/** Floating WhatsApp chat button, shown site-wide once an admin sets a number
 *  in Settings. Hidden entirely when no number is configured. */
export function WhatsAppButton() {
  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => getPlatformSettings(supabase),
  });

  const number = settings?.whatsapp_number?.replace(/[^\d]/g, "");
  if (!number) return null;

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_8px_20px_-4px_rgba(37,211,102,0.5)] transition-transform hover:scale-105 print:hidden"
      style={{ background: "#25D366" }}
    >
      <svg viewBox="0 0 32 32" width="30" height="30" fill="#ffffff" aria-hidden="true">
        <path d="M16.004 3C9.374 3 4 8.373 4 15.003c0 2.444.72 4.72 1.956 6.627L4 29l7.56-1.924a11.93 11.93 0 0 0 4.444.86h.004C22.63 27.936 28 22.563 28 15.933 28 9.303 22.633 3 16.004 3Zm0 21.99h-.003a9.95 9.95 0 0 1-5.08-1.392l-.364-.216-4.486 1.142 1.197-4.374-.237-.45a9.93 9.93 0 0 1-1.534-5.3c0-5.49 4.47-9.957 9.97-9.957 2.663 0 5.166 1.038 7.05 2.922a9.886 9.886 0 0 1 2.918 7.044c0 5.49-4.47 9.58-9.431 9.58Zm5.473-7.456c-.3-.15-1.773-.875-2.048-.975-.274-.1-.474-.15-.674.15-.2.3-.774.975-.949 1.175-.174.2-.35.225-.65.075-.3-.15-1.266-.467-2.412-1.49-.892-.796-1.494-1.78-1.669-2.08-.174-.3-.019-.462.131-.611.135-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.674-1.627-.924-2.227-.244-.585-.492-.506-.674-.515l-.574-.01c-.2 0-.525.075-.8.375-.274.3-1.049 1.025-1.049 2.5s1.074 2.9 1.224 3.1c.15.2 2.112 3.226 5.12 4.524.715.309 1.273.493 1.708.631.718.228 1.371.196 1.888.119.576-.086 1.773-.725 2.023-1.425.25-.7.25-1.3.175-1.425-.075-.125-.274-.2-.574-.35Z" />
      </svg>
    </a>
  );
}
