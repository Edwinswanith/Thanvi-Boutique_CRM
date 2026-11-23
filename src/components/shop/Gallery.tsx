"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

interface GalleryProps {
  photos: string[];
  alt: string;
}

/**
 * Product photos. Desktop: thumbnails, crossfade and hover-to-zoom that follows the
 * cursor. Mobile: swipe between photos with dots.
 */
export function Gallery({ photos, alt }: GalleryProps) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const many = photos.length > 1;

  const go = (i: number) => {
    const next = (i + photos.length) % photos.length;
    setActive(next);
    track.current?.scrollTo({ left: next * track.current.clientWidth, behavior: "smooth" });
  };

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const onKey = (e: KeyboardEvent) => {
    if (!many) return;
    if (e.key === "ArrowRight") go(active + 1);
    if (e.key === "ArrowLeft") go(active - 1);
  };

  if (photos.length === 0) return <div className="aspect-[3/4] rounded-[3px] bg-gold-wash" />;

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row" onKeyDown={onKey}>
      {many && (
        <div className="hidden gap-3 lg:flex lg:w-20 lg:flex-col" role="tablist" aria-label="Product photos">
          {photos.map((src, i) => (
            <button key={src} type="button" role="tab" aria-selected={i === active} aria-label={`Photo ${i + 1}`} onClick={() => go(i)}
              className={`relative aspect-[3/4] w-full overflow-hidden rounded-[2px] transition-all duration-300 ${i === active ? "ring-2 ring-gold-bright ring-offset-2 ring-offset-ivory" : "opacity-60 hover:opacity-100"}`}>
              <Image src={src} alt="" fill sizes="80px" className="object-cover object-top" />
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1">
        {/* Desktop: stacked crossfade + zoom */}
        <div className="relative hidden aspect-[3/4] cursor-zoom-in overflow-hidden rounded-[3px] bg-gold-wash lg:block"
          onMouseMove={onMove} onMouseLeave={() => setZoom(null)}>
          {photos.map((src, i) => (
            <Image key={src} src={src} alt={i === active ? alt : ""} fill priority={i === 0} sizes="(min-width: 1024px) 50vw, 100vw"
              className={`object-cover object-top transition-[opacity,transform] duration-500 ease-out ${i === active ? "opacity-100" : "opacity-0"}`}
              style={i === active && zoom ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
          ))}
          {!zoom && <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-paper/85 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] backdrop-blur fade-in">HOVER TO ZOOM</span>}
        </div>

        {/* Mobile: swipeable track */}
        <div ref={track} className="no-scrollbar flex aspect-[3/4] snap-x snap-mandatory overflow-x-auto rounded-[3px] bg-gold-wash lg:hidden"
          onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {photos.map((src, i) => (
            <div key={src} className="relative h-full w-full shrink-0 snap-center">
              <Image src={src} alt={i === 0 ? alt : `${alt}, photo ${i + 1}`} fill priority={i === 0} sizes="100vw" className="object-cover object-top" />
            </div>
          ))}
        </div>
        {many && (
          <div className="mt-3 flex justify-center gap-1.5 lg:hidden" aria-hidden>
            {photos.map((src, i) => <span key={src} className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-ink" : "w-1.5 bg-line-strong"}`} />)}
          </div>
        )}
      </div>
    </div>
  );
}
