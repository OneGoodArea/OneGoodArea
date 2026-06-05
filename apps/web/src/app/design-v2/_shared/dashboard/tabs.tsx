/* AR-228 (Dashboard redesign Epic AR-217): horizontal tab strip primitive.

   Used for:
   - Intelligence sub-tabs (Query / NL / Peers / Insights / Forecast — D4 locked)
   - Settings page sections (Profile / Password / Subscription / Org membership)
   - Monitor sub-views (Portfolios / Changes feed / Webhooks)
   - Any surface that needs to switch between related-but-distinct panels

   The Tabs component is JUST the strip. It does NOT render the panel
   content — the consumer renders panels based on the activeId. Keeps
   the primitive focused; consumer keeps control over layout, lazy
   mounting, URL syncing, transitions.

   Controlled API: parent owns activeId, gets onChange callbacks.
   Keyboard nav follows WAI-ARIA Tabs pattern: roving tabindex (only
   active tab is tabindex=0), arrow keys move focus + activate.

   Two visual variants:
   - underline (default) — bottom hairline under the strip, 2px ink
     underline on the active tab. The Intelligence sub-tabs pattern.
   - pill — active tab gets a small ink-tinted rounded rectangle bg.
     Used for filter strips + settings sub-sections. */

"use client";

import { useCallback, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import "./tabs.css";

export interface TabItem {
  /** Stable identifier the consumer uses to switch panels. */
  id: string;
  /** Display label. */
  label: string;
  /** Optional leading icon at 16px. */
  icon?: ReactNode;
  /** Optional trailing badge — count, "NEW" indicator, status pill. */
  badge?: ReactNode;
  /** Greyed out, not selectable, skipped by keyboard nav. */
  disabled?: boolean;
}

export type TabsVariant = "underline" | "pill";

export interface TabsProps {
  /** Tab definitions in render order. */
  items: TabItem[];
  /** Currently active tab id (controlled). */
  activeId: string;
  /** Fired when the user picks a different tab. */
  onChange: (id: string) => void;
  /** Visual variant. Default "underline". */
  variant?: TabsVariant;
  /** Accessible label for the tablist (announced by screen readers). */
  "aria-label"?: string;
}

export function Tabs({
  items,
  activeId,
  onChange,
  variant = "underline",
  "aria-label": ariaLabel,
}: TabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  /* Move focus + activation to the next selectable tab in the given
     direction. Wraps around. Skips disabled tabs. */
  const moveFocus = useCallback(
    (fromIndex: number, direction: 1 | -1) => {
      const total = items.length;
      if (total === 0) return;
      let i = ((fromIndex + direction) % total + total) % total;
      let safety = total;
      while (items[i]?.disabled && safety > 0) {
        i = ((i + direction) % total + total) % total;
        safety -= 1;
      }
      const item = items[i];
      if (item && !item.disabled) {
        onChange(item.id);
        tabRefs.current[i]?.focus();
      }
    },
    [items, onChange],
  );

  const focusFirstOrLast = useCallback(
    (target: "first" | "last") => {
      const indices = items
        .map((it, i) => (!it.disabled ? i : -1))
        .filter((i) => i >= 0);
      if (indices.length === 0) return;
      const targetIndex = target === "first" ? indices[0]! : indices[indices.length - 1]!;
      const item = items[targetIndex];
      if (item) {
        onChange(item.id);
        tabRefs.current[targetIndex]?.focus();
      }
    },
    [items, onChange],
  );

  const handleKey = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        moveFocus(index, 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        moveFocus(index, -1);
        break;
      case "Home":
        e.preventDefault();
        focusFirstOrLast("first");
        break;
      case "End":
        e.preventDefault();
        focusFirstOrLast("last");
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="oga-tabs"
      data-variant={variant}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item, i) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`${item.id}-panel`}
            id={`${item.id}-tab`}
            tabIndex={isActive ? 0 : -1}
            disabled={item.disabled}
            className="oga-tabs__tab"
            data-active={isActive ? "true" : undefined}
            onClick={() => {
              if (!item.disabled) onChange(item.id);
            }}
            onKeyDown={(e) => handleKey(e, i)}
          >
            {item.icon ? (
              <span className="oga-tabs__icon" aria-hidden="true">
                {item.icon}
              </span>
            ) : null}
            <span className="oga-tabs__label">{item.label}</span>
            {item.badge ? (
              <span className="oga-tabs__badge" aria-hidden="true">
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
