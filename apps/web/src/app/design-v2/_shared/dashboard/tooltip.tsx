/* AR-239 (Dashboard redesign Epic AR-217 — Phase 0.5): non-blocking tooltip primitive.

   Used everywhere across the dashboard for short explanations that don't
   warrant a modal or a click-trigger menu:
   - RBAC reason ("Why is this button disabled?")
   - Signal descriptions ("normalized_value = within-country percentile")
   - Last-owner-guard rationale on the Members page
   - Methodology pin warnings
   - Status hovers ("Failing - last 3 deliveries returned 5xx")

   Composition model:
   - Wrapper API: <Tooltip content="...">{trigger}</Tooltip>
   - Trigger child gets wrapped in a span that handles hover + focus +
     keyboard events. We do NOT clone the child — wrapping is cleaner
     than cloneElement for custom components, and the span is
     display:inline-flex so it doesn't perturb layout.
   - Tooltip opens on hover OR focus (touch defers to long-press in v2)
   - Dismisses on blur, mouse-leave, Escape key
   - role="tooltip" on the panel, aria-describedby wired on the trigger
   - Smart placement: top by default; flips to bottom if it would
     overflow the viewport top.

   Brand v3 vocabulary — dark panel by default (graphite gradient +
   edge-lit material recipe matching .oga-dropdown__panel). On dark
   scaffolding surfaces, opt into the light variant via surface="light"
   so the tooltip reads against the dark page.

   No third-party positioning library — small surface, simple math.
   No portal — absolute positioning relative to the wrapper handles
   dashboard surfaces fine; if a real consumer surface hits
   overflow:hidden clipping in v2, extract a portal variant then. */

"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./tooltip.css";

/* ============================================================
   Types
   ============================================================ */

export type TooltipPlacement = "top" | "bottom";

export interface TooltipProps {
  /** The short explanation. Single string — rich content is out of scope. */
  content: string;
  /** The trigger element (button / icon / link / inline span). */
  children: ReactNode;
  /** Preferred placement. The tooltip auto-flips to the other side
      if it would overflow the viewport. Default "top". */
  placement?: TooltipPlacement;
  /** Surface variant. Dark (default) shows a graphite panel; light
      shows a warm-white panel for use on dark scaffolding pages. */
  surface?: "dark" | "light";
  /** Delay before showing the tooltip on hover, in milliseconds.
      Default 250ms. Focus shows immediately (keyboard users
      shouldn't wait). */
  delay?: number;
}

/* ============================================================
   Component
   ============================================================ */

export function Tooltip({
  content,
  children,
  placement = "top",
  surface = "dark",
  delay = 250,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [resolvedPlacement, setResolvedPlacement] = useState<TooltipPlacement>(placement);

  const wrapperRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const showTimerRef = useRef<number | null>(null);

  const id = useId();
  const tooltipId = `tooltip-${id}`;

  const cancelShow = useCallback(() => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const handlePointerEnter = useCallback(() => {
    cancelShow();
    showTimerRef.current = window.setTimeout(() => {
      setOpen(true);
    }, delay);
  }, [delay, cancelShow]);

  const handlePointerLeave = useCallback(() => {
    cancelShow();
    setOpen(false);
  }, [cancelShow]);

  /* Focus shows immediately (no delay) — keyboard users shouldn't
     wait for an artificial timer they didn't request. */
  const handleFocus = useCallback(() => {
    cancelShow();
    setOpen(true);
  }, [cancelShow]);

  const handleBlur = useCallback(() => {
    cancelShow();
    setOpen(false);
  }, [cancelShow]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  }, [open]);

  /* Cleanup timers on unmount */
  useEffect(() => {
    return () => cancelShow();
  }, [cancelShow]);

  /* Compute placement when open. useLayoutEffect runs before paint
     so the user never sees a one-frame flicker of the wrong side. */
  useLayoutEffect(() => {
    if (!open) {
      /* Reset to preferred placement when closed so the next open
         starts from the consumer's request, not the last flip. */
      setResolvedPlacement(placement);
      return;
    }
    const wrapper = wrapperRef.current;
    const panel = panelRef.current;
    if (!wrapper || !panel) return;

    const triggerRect = wrapper.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const margin = 8;

    if (placement === "top") {
      const spaceAbove = triggerRect.top;
      if (spaceAbove < panelRect.height + margin) {
        setResolvedPlacement("bottom");
      } else {
        setResolvedPlacement("top");
      }
    } else {
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      if (spaceBelow < panelRect.height + margin) {
        setResolvedPlacement("top");
      } else {
        setResolvedPlacement("bottom");
      }
    }
  }, [open, placement, content]);

  return (
    <span
      ref={wrapperRef}
      className="oga-tooltip"
      data-surface={surface}
      data-placement={resolvedPlacement}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <span className="oga-tooltip__trigger" aria-describedby={open ? tooltipId : undefined}>
        {children}
      </span>
      {open ? (
        <span
          ref={panelRef}
          id={tooltipId}
          role="tooltip"
          className="oga-tooltip__panel"
          data-surface={surface}
          data-placement={resolvedPlacement}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
