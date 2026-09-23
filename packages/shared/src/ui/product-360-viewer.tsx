import * as React from "react";
import { ChevronLeft, ChevronRight, Maximize2, Pause, Play, RotateCcw, X } from "lucide-react";

/** One full drag across the viewer width = one full revolution, so the product
 *  tracks the finger/cursor the way a real turntable viewer does. */
const REVOLUTIONS_PER_WIDTH = 1;
/** Frames per second while auto-rotating. */
const AUTO_ROTATE_FPS = 18;
/** How quickly a flick's momentum dies off (per frame, ~60fps). */
const INERTIA_DECAY = 0.94;
/** Below this speed the spin stops coasting. */
const INERTIA_CUTOFF = 0.02;

/**
 * Interactive 360° spin built from the uploaded frames. Drag with a mouse,
 * swipe on touch, flick to coast, or use the arrows / auto-rotate. Frames are
 * preloaded before interaction so rotation never stutters or flashes, and the
 * index wraps modulo the frame count so looping is seamless.
 */
export function Product360Viewer({
  images,
  className,
}: {
  /** Frame photos in rotation order. */
  images: string[];
  className?: string;
}) {
  const count = images.length;

  // Fractional so a slow drag still moves smoothly between frames.
  const [position, setPosition] = React.useState(0);
  const [autoRotate, setAutoRotate] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [loaded, setLoaded] = React.useState(0);
  const [fullscreen, setFullscreen] = React.useState(false);

  const boxRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ lastX: number; velocity: number; moved: boolean } | null>(null);
  const inertiaRef = React.useRef<number | null>(null);

  const frame = ((Math.round(position) % count) + count) % count;
  const ready = count > 0 && loaded >= count;

  /* Preload every frame up front — this is what separates a smooth spin from
     a stuttering one, since each rotation step would otherwise hit the network. */
  React.useEffect(() => {
    setLoaded(0);
    if (count === 0) return;
    let cancelled = false;
    const imgs = images.map((src) => {
      const img = new Image();
      img.src = src;
      const done = () => {
        if (!cancelled) setLoaded((n) => n + 1);
      };
      if (img.complete) done();
      else {
        img.onload = done;
        // A broken frame shouldn't hang the viewer forever.
        img.onerror = done;
      }
      return img;
    });
    return () => {
      cancelled = true;
      for (const img of imgs) {
        img.onload = null;
        img.onerror = null;
      }
    };
  }, [images, count]);

  const stopInertia = React.useCallback(() => {
    if (inertiaRef.current != null) {
      cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = null;
    }
  }, []);

  React.useEffect(() => stopInertia, [stopInertia]);

  React.useEffect(() => {
    if (!autoRotate || dragging || !ready) return;
    const id = setInterval(() => setPosition((p) => p + 1), 1000 / AUTO_ROTATE_FPS);
    return () => clearInterval(id);
  }, [autoRotate, dragging, ready]);

  /** Frames moved per pixel of horizontal drag. */
  function framesPerPixel() {
    const width = boxRef.current?.clientWidth ?? 1;
    return (count * REVOLUTIONS_PER_WIDTH) / width;
  }

  function coast(velocity: number) {
    let v = velocity;
    const tick = () => {
      v *= INERTIA_DECAY;
      if (Math.abs(v) < INERTIA_CUTOFF) {
        inertiaRef.current = null;
        return;
      }
      setPosition((p) => p + v);
      inertiaRef.current = requestAnimationFrame(tick);
    };
    inertiaRef.current = requestAnimationFrame(tick);
  }

  if (count === 0) return null;

  const viewer = (
    <div
      ref={boxRef}
      role="group"
      aria-label="360 degree product view"
      className={
        fullscreen
          ? "relative h-full w-full touch-pan-y select-none overflow-hidden bg-black"
          : "relative h-[260px] touch-pan-y select-none overflow-hidden rounded-[10px] border border-border bg-surface sm:h-[470px]"
      }
      style={{ cursor: dragging ? "grabbing" : "grab" }}
      onPointerDown={(e) => {
        if (!ready) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        stopInertia();
        setAutoRotate(false);
        setDragging(true);
        dragRef.current = { lastX: e.clientX, velocity: 0, moved: false };
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current;
        if (!drag || !dragging) return;
        const dx = e.clientX - drag.lastX;
        if (dx === 0) return;
        // Dragging right spins the product clockwise.
        const delta = dx * framesPerPixel();
        drag.lastX = e.clientX;
        drag.velocity = delta;
        drag.moved = true;
        setPosition((p) => p + delta);
      }}
      onPointerUp={() => {
        const drag = dragRef.current;
        setDragging(false);
        dragRef.current = null;
        if (drag?.moved && Math.abs(drag.velocity) > INERTIA_CUTOFF) coast(drag.velocity);
      }}
      onPointerCancel={() => {
        setDragging(false);
        dragRef.current = null;
      }}
    >
      {/* Stacked frames: all are in the DOM and only opacity changes, so a
          rotation step never waits on a decode or flashes a blank box. */}
      {images.map((src, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={src}
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          style={{ opacity: i === frame ? 1 : 0 }}
        />
      ))}

      {!ready ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/80">
          <RotateCcw className="h-5 w-5 animate-spin text-accent" />
          <span className="text-[12px] font-semibold text-muted">
            Loading 360° view… {Math.round((loaded / count) * 100)}%
          </span>
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Rotate left"
        onClick={() => {
          stopInertia();
          setPosition((p) => p - 1);
        }}
        className="absolute left-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Rotate right"
        onClick={() => {
          stopInertia();
          setPosition((p) => p + 1);
        }}
        className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {ready && !dragging ? (
        <span className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white">
          <RotateCcw className="h-3 w-3" />
          Drag to rotate
        </span>
      ) : null}

      <button
        type="button"
        aria-label={fullscreen ? "Exit full screen" : "View full screen"}
        onClick={() => setFullscreen((v) => !v)}
        className="absolute right-2.5 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white"
      >
        {fullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>

      <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-2">
        <button
          type="button"
          onClick={() => {
            stopInertia();
            setAutoRotate((v) => !v);
          }}
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
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-black p-2 sm:p-6">
        <div className="h-full w-full">{viewer}</div>
      </div>
    );
  }

  return <div className={className}>{viewer}</div>;
}
