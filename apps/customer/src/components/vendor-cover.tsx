import { DEFAULT_VENDOR_BANNER } from "@/lib/vendor-banner";

/** A store banner in a 5:1 box. Vendors upload banners of any shape, so the
 *  whole image is shown (never cropped) over a blurred copy of itself that
 *  fills the leftover space. */
export function VendorCover({ url, className = "" }: { url: string | null | undefined; className?: string }) {
  const src = url ?? DEFAULT_VENDOR_BANNER;
  return (
    <div className={`relative aspect-[5/1] w-full overflow-hidden bg-surface-alt ${className}`}>
      <div
        aria-hidden
        className="absolute inset-0 scale-110 bg-cover bg-center blur-xl"
        style={{ backgroundImage: `url(${src})` }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="relative h-full w-full object-contain" loading="lazy" />
    </div>
  );
}
