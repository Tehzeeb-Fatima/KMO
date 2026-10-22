"use client";

import { useEffect, useState } from "react";
import { colourImageUrl, knownSwatch } from "@kmo/shared/lib";

type Variant = { id: string; option_name: string; option_value: string };
type Image = { url: string; sort_order: number; variant_id?: string | null };

/** Average colour of the fabric in a photo, skipping the white/grey backdrop
 *  most product photos are shot on. */
function photoColour(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const n = 48;
        const c = document.createElement("canvas");
        c.width = n;
        c.height = n;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(null);
        // middle of the photo, where the product sits
        const w = img.naturalWidth, h = img.naturalHeight;
        ctx.drawImage(img, w * 0.2, h * 0.2, w * 0.6, h * 0.6, 0, 0, n, n);
        const d = ctx.getImageData(0, 0, n, n).data;
        let r = 0, g = 0, b = 0, k = 0, ar = 0, ag = 0, ab = 0;
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2];
          ar += R; ag += G; ab += B;
          const max = Math.max(R, G, B), min = Math.min(R, G, B);
          const backdrop = max > 205 && max - min < 28; // near-white, unsaturated
          if (!backdrop) { r += R; g += G; b += B; k++; }
        }
        const total = d.length / 4;
        // a white/cream product: keep everything
        if (k < total * 0.2) { r = ar; g = ag; b = ab; k = total; }
        resolve(`rgb(${Math.round(r / k)}, ${Math.round(g / k)}, ${Math.round(b / k)})`);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Swatch colour for each colour option: a known colour name when there is one,
 *  otherwise the colour of that option's own photo. */
export function usePhotoSwatches(colours: string[], variants: Variant[], images: Image[]) {
  const [fromPhotos, setFromPhotos] = useState<Record<string, string>>({});
  // Colour names are checked with the browser's CSS, so wait until mounted
  // (the server can't, and the first render must match it).
  const [mounted, setMounted] = useState(false);
  const key = colours.join("|");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const todo = colours.filter((c) => !knownSwatch(c));
    void Promise.all(
      todo.map(async (c) => {
        const url = colourImageUrl(variants, images, c);
        return [c, url ? await photoColour(url) : null] as const;
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [c, col] of pairs) if (col) next[c] = col;
      setFromPhotos(next);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (colour: string) => (mounted ? (knownSwatch(colour) ?? fromPhotos[colour]) : undefined) ?? "#d9d4d0";
}
