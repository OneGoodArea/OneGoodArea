/* AR-221 (Dashboard redesign Epic AR-217): trigger + floating menu primitive.

   Used for the org switcher (sidebar top), user menu (sidebar bottom), row
   actions on data tables (Edit / Delete / Duplicate per row), and sort
   selectors. All keyboard-accessible: arrow keys navigate items, Home/End
   jump to ends, Enter activates, Escape closes + returns focus to trigger,
   Tab closes + moves to next page element.

   Uncontrolled by default — internal open state. Most consumers want
   fire-and-forget behaviour (click trigger → click item → menu closes →
   action runs). If a consumer ever needs controlled mode we add open +
   onOpenChange then; YAGNI for now.

   Positioning: absolute relative to a position:relative wrapper around the
   trigger + panel. Two alignment options (start: left-aligned with trigger,
   end: right-aligned). Browser-edge collision handling deferred — every
   dashboard surface that uses this has predictable container widths. */

"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import "./dropdown-menu.css";

export interface DropdownItem {
  /** Display label. */
  label: string;
  /** Optional leading icon (SVG, ReactNode). */
  icon?: ReactNode;
  /** Click handler. Menu closes after invocation. */
  onClick: () => void;
  /** Greyed out, not selectable, skipped by keyboard nav. */
  disabled?: boolean;
  /** Renders in status red. For destructive actions (Delete, Revoke). */
  danger?: boolean;
  /** Optional right-aligned hint (e.g. keyboard shortcut "⌘K"). */
  shortcut?: string;
}

export type DropdownAlign = "start" | "end";

/** Section divider in the items list. Renders a hairline rule with an
    optional eyebrow label — used to group items editorially (e.g.
    "Recent orgs" / "Actions"). */
export interface DropdownDivider {
  divider: true;
  label?: string;
}

export type DropdownEntry = DropdownItem | DropdownDivider;

function isDivider(entry: DropdownEntry): entry is DropdownDivider {
  return (entry as DropdownDivider).divider === true;
}

export interface DropdownMenuProps {
  /** Trigger content — rendered inside our button wrapper. The consumer
      passes the visible label/icon/etc.; we attach the click handler +
      aria semantics. */
  trigger: ReactNode;
  /** Items + dividers to render in the panel. */
  items: DropdownEntry[];
  /** Panel alignment relative to trigger. Default "start" (left-aligned). */
  align?: DropdownAlign;
  /** Optional accessible label for the trigger button. */
  triggerLabel?: string;
  /** Optional className on the trigger button (consumers wire their own
      Brand v3 button style — primary, secondary, ghost, sidebar-row, etc.). */
  triggerClassName?: string;
  /** Optional eyebrow header rendered at the top of the panel (mono,
      uppercase, muted). Use for context labels like "Switch organisation"
      or "Account". */
  header?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = "start",
  triggerLabel,
  triggerClassName,
  header,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  /* focusIndex: -1 means nothing focused (initial). On arrow-down from
     -1 we jump to the first enabled item; arrow-up jumps to the last.
     Index is into the FLAT items array (including dividers); we skip
     dividers + disabled items during keyboard nav. */
  const [focusIndex, setFocusIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setFocusIndex(-1);
  }, []);

  /* True if the entry at `index` is selectable — i.e. an item (not a
     divider) that isn't disabled. */
  const isSelectable = useCallback(
    (index: number) => {
      const entry = items[index];
      if (!entry) return false;
      if (isDivider(entry)) return false;
      return !entry.disabled;
    },
    [items],
  );

  /* Move focus to the next selectable item in the given direction. Wraps
     around. Skips dividers + disabled items so keyboard nav never lands
     on something unactionable. */
  const focusItemAt = useCallback(
    (rawIndex: number, direction: 1 | -1 = 1) => {
      if (items.length === 0) return;
      let i = ((rawIndex % items.length) + items.length) % items.length;
      let safety = items.length;
      while (!isSelectable(i) && safety > 0) {
        i = ((i + direction) % items.length + items.length) % items.length;
        safety -= 1;
      }
      setFocusIndex(i);
      itemRefs.current[i]?.focus();
    },
    [items, isSelectable],
  );

  /* When focusIndex changes while open, move DOM focus to that item.
     State updates happen in the open handlers (not here) so the effect
     stays a pure DOM-side-effect and doesn't trigger setState cascades. */
  useEffect(() => {
    if (open && focusIndex >= 0) {
      itemRefs.current[focusIndex]?.focus();
    }
  }, [open, focusIndex]);

  /* Click outside the wrapper closes the menu. */
  useEffect(() => {
    if (!open) return;
    function handleDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      close();
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [open, close]);

  /* Pick the first selectable item's index, or -1 if none. */
  const firstEnabledIndex = useCallback(() => {
    return items.findIndex((it) => !isDivider(it) && !it.disabled);
  }, [items]);

  const handleTriggerClick = () => {
    if (!open) {
      const first = firstEnabledIndex();
      setFocusIndex(first >= 0 ? first : -1);
    }
    setOpen((v) => !v);
  };

  const handleTriggerKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      const first = firstEnabledIndex();
      setFocusIndex(first >= 0 ? first : -1);
      setOpen(true);
    }
  };

  const handlePanelKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        triggerRef.current?.focus();
        break;
      case "ArrowDown":
        e.preventDefault();
        focusItemAt(focusIndex + 1, 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItemAt(focusIndex - 1, -1);
        break;
      case "Home":
        e.preventDefault();
        focusItemAt(0, 1);
        break;
      case "End":
        e.preventDefault();
        focusItemAt(items.length - 1, -1);
        break;
      case "Tab":
        /* Tab closes + lets the browser move focus naturally. */
        close();
        break;
      default:
        break;
    }
  };

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return;
    item.onClick();
    close();
    triggerRef.current?.focus();
  };

  return (
    <div className="oga-dropdown">
      <button
        ref={triggerRef}
        type="button"
        className={["oga-dropdown__trigger", triggerClassName].filter(Boolean).join(" ")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={triggerLabel}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKey}
      >
        {trigger}
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-orientation="vertical"
          data-align={align}
          className="oga-dropdown__panel"
          onKeyDown={handlePanelKey}
        >
          {header ? (
            <p className="oga-dropdown__header" aria-hidden="true">
              {header}
            </p>
          ) : null}
          {items.map((entry, i) => {
            if (isDivider(entry)) {
              return (
                <div
                  key={`div-${i}`}
                  className="oga-dropdown__divider"
                  role="separator"
                >
                  {entry.label ? (
                    <span className="oga-dropdown__divider-label">{entry.label}</span>
                  ) : null}
                </div>
              );
            }
            return (
              <button
                key={`${entry.label}-${i}`}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                className="oga-dropdown__item"
                data-danger={entry.danger ? "true" : undefined}
                disabled={entry.disabled}
                tabIndex={focusIndex === i ? 0 : -1}
                onClick={() => handleItemClick(entry)}
              >
                {entry.icon ? (
                  <span className="oga-dropdown__item-icon" aria-hidden="true">
                    {entry.icon}
                  </span>
                ) : null}
                <span className="oga-dropdown__item-label">{entry.label}</span>
                {entry.shortcut ? (
                  <span className="oga-dropdown__item-shortcut" aria-hidden="true">
                    {entry.shortcut}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
