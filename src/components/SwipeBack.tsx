"use client";

/**
 * SwipeBack — global gesture navigation.
 *
 * Mobile  : Left-edge touch swipe right (≥60px) → router.back()
 * Mac/PC  : Two-finger trackpad horizontal swipe → back / forward
 *           Ignores swipes that occur inside a horizontally-scrollable element.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Walk up the DOM tree; return true if any ancestor scrolls horizontally */
function insideHorizScroll(target: EventTarget | null): boolean {
  let el = target as HTMLElement | null;
  while (el && el !== document.documentElement) {
    const ox = window.getComputedStyle(el).overflowX;
    if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

export default function SwipeBack() {
  const router = useRouter();

  // ── Mobile touch swipe-back ──────────────────────────────────────
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let active = false;

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      active = startX <= 28;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!active) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      active = false;
      if (dx >= 60 && dy < 40) router.back();
    }

    function onTouchCancel() { active = false; }

    document.addEventListener("touchstart",  onTouchStart,  { passive: true });
    document.addEventListener("touchend",    onTouchEnd,    { passive: true });
    document.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      document.removeEventListener("touchstart",  onTouchStart);
      document.removeEventListener("touchend",    onTouchEnd);
      document.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [router]);

  // ── Mac trackpad / mouse wheel horizontal swipe ──────────────────
  useEffect(() => {
    let accumX = 0;
    let accumY = 0;
    let fired  = false;
    let timer: ReturnType<typeof setTimeout>;

    function onWheel(e: WheelEvent) {
      // Skip if the target is inside a horizontally-scrollable container
      if (insideHorizScroll(e.target)) return;

      accumX += e.deltaX;
      accumY += e.deltaY;

      clearTimeout(timer);
      // Reset accumulator ~200ms after the last wheel event (end of gesture)
      timer = setTimeout(() => {
        accumX = 0;
        accumY = 0;
        fired  = false;
      }, 200);

      if (fired) return;

      // Only trigger when horizontal dominates significantly
      const absX = Math.abs(accumX);
      const absY = Math.abs(accumY);
      if (absX < 80 || absX < absY * 2.5) return;

      fired = true;
      if (accumX < 0) {
        router.back();      // two-finger swipe right → back
      } else {
        router.forward();   // two-finger swipe left  → forward
      }
    }

    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [router]);

  return null;
}
