"use client";

import { Children, useRef, type ReactNode } from "react";

const DEFAULT_ITEM = "w-[46%] sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]";

export function HorizontalSlider({
  children,
  itemClassName = DEFAULT_ITEM,
  className,
}: {
  children: ReactNode;
  itemClassName?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function scrollBy(direction: 1 | -1) {
    ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <div ref={ref} className="-my-6 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth py-6 sm:gap-4">
        {Children.map(children, (child) => (
          <div className={`shrink-0 snap-start ${itemClassName}`}>{child}</div>
        ))}
      </div>
      <button
        type="button"
        aria-label="Previous"
        onClick={() => scrollBy(-1)}
        className="absolute -left-2 top-1/3 hidden h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold text-primary shadow-sm md:flex"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => scrollBy(1)}
        className="absolute -right-2 top-1/3 hidden h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold text-primary shadow-sm md:flex"
      >
        ›
      </button>
    </div>
  );
}
