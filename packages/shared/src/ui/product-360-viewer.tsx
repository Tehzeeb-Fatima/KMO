import * as React from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";

/** Pixels of horizontal drag needed to advance one angle. */
const DRAG_STEP_PX = 28;
const AUTO_ROTATE_MS = 220;

/**
 * Interactive 360° spin built from the 8 uploaded angle photos. Drag with a
 * mouse, swipe on touch, or use the arrows / auto-rotate. Looping is seamless
 * because the frame index wraps around modulo the frame count.
 */
export function Product360Viewer({
  images,
  className,
}: {
  /** Angle photos in rotation order (front → front-left). */
  images: string[];
  className?: string;
}) {
  const [frame, setFrame] = React.useState(0);
  const [autoRotate, setAutoRotate] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const dragRef = React.useRef<{ startX: number; startFrame: number } | null>(null);
  const count = images.length;

  const step = React.useCallback(
    (delta: number) => setFrame((f) => (((f + delta) % count) + count) % count),
    [count],
  );

  React.useEffect(() => {
    if (!autoRotate || dragging) return;
    const id = setInterval(() => step(1), AUTO_ROTATE_MS);
    return () => clearInterval(id);
  }, [autoRotate, dragging, step]);

  function startDrag(clientX: number) {
    setDragging(true);
    dragRef.current = { startX: clientX, startFrame: frame };
  }

  function moveDrag(clientX: number) {
    const drag = dragRef.current;
    if (!drag) return;
    // Dragging right spins the product clockwise (forward through the angles).
    const steps = Math.round((clientX - drag.startX) / DRAG_STEP_PX);
    const next = (((drag.startFrame + steps) % count) + count) % count;
    setFrame(next);
  }

  function endDrag() {
    setDragging(false);
    dragRef.current = null;
  }

  if (count === 0) return null;

  return (
    <div className={className}>
      <div
        role="group"
        aria-label="360 degree product view"
        className="relative h-[260px] touch-pan-y select-none overflow-hidden rounded-[10px] border border-border bg-surface sm:h-[470px]"
        style={{
          backgroundImage: `url(${images[frame]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          cursor: dragging ? "grabbing" : "grab",
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          startDrag(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging) moveDrag(e.clientX);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Preload every frame so the spin doesn't flicker on first rotation. */}
        <div aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden">
          {images.map((url) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={url} src={url} alt="" width={1} height={1} />
          ))}
        </div>

        <button
          type="button"
          aria-label="Rotate left"
          onClick={() => step(-1)}
          className="absolute left-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Rotate right"
          onClick={() => step(1)}
          className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <span className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white">
          <RotateCcw className="h-3 w-3" />
          Drag to rotate
        </span>

        <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-primary shadow hover:bg-white"
          >
            {autoRotate ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {autoRotate ? "Stop" : "Auto Rotate"}
          </button>
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
            {frame + 1} / {count}
          </span>
        </div>
      </div>
    </div>
  );
}
