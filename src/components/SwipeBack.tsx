"use client";

/**
 * SwipeBack — global edge-swipe gesture to navigate back.
 *
 * Detects a swipe that starts within 28px of the left edge and travels
 * at least 60px horizontally while staying within ±40px vertically.
 * On success, calls router.back() (same as browser back button).
 *
 * Mount once in the root layout. No visible UI.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SwipeBack() {
  const router = useRouter();

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let active = false;

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      // Only activate when starting within 28px of left edge
      active = startX <= 28;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!active) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      active = false;

      // Swipe right >= 60px, mostly horizontal (dy < 40px)
      if (dx >= 60 && dy < 40) {
        router.back();
      }
    }

    function onTouchCancel() {
      active = false;
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend",   onTouchEnd,   { passive: true });
    document.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend",   onTouchEnd);
      document.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [router]);

  return null;
}
