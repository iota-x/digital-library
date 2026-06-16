"use client";
import { useEffect, useRef } from "react";

/**
 * Keyboard focus-trap for modal dialogs.
 *
 * - When `active` becomes true: remembers the currently focused element,
 *   moves focus to the first focusable element inside the ref, and traps
 *   Tab / Shift+Tab so it can't escape the dialog.
 * - When `active` becomes false: restores focus to where it was before.
 *
 * Pass `onEscape` to handle Esc-to-close (most modals already do this elsewhere).
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useFocusTrap(ref, { active: open, onEscape: () => setOpen(false) });
 *   return <div ref={ref} role="dialog" aria-modal="true">…</div>;
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  opts: { active: boolean; onEscape?: () => void; initialFocus?: React.RefObject<HTMLElement | null> }
) {
  const previousActive = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!opts.active) return;
    const container = containerRef.current;
    if (!container) return;

    // Remember the element that opened the modal so we can restore focus on close
    previousActive.current = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;

    const focusables = () => Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => el.offsetParent !== null || el === document.activeElement);

    // Move focus inside the dialog
    const target = opts.initialFocus?.current ?? focusables()[0] ?? container;
    target.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && opts.onEscape) {
        e.stopPropagation();
        opts.onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) { e.preventDefault(); return; }
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !container.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // Restore focus to whatever opened the modal — only if it's still in DOM
      const prev = previousActive.current;
      if (prev && document.contains(prev)) {
        try { prev.focus({ preventScroll: true }); } catch {}
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.active]);
}
