/* AR-220 (Dashboard redesign Epic AR-217): focused overlay primitive.

   Built on the native <dialog> element, which gives us for free:
   - Focus trap (Tab cycles within the dialog, never escapes)
   - Escape key fires cancel event (we preventDefault + call onClose)
   - Body scroll lock when opened via showModal()
   - Top-layer positioning (above z-index stacking contexts, ::backdrop renders)
   - aria-modal semantics

   The component is controlled — consumer owns the `open` state. Effect
   synchronises with showModal()/close() so the dialog mirrors the prop.

   Backdrop click closes by default (configurable via closeOnBackdrop=false
   for "must confirm" flows like destructive deletes). Click detection works
   because clicks on the backdrop bubble with target=<dialog>; clicks on the
   inner content bubble with target=<inner-element>. */

"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode, MouseEvent as ReactMouseEvent, SyntheticEvent } from "react";
import "./modal.css";

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  /** Controlled open state. Consumer owns it; this component mirrors it. */
  open: boolean;
  /** Called when the user dismisses via Escape, close button, or backdrop. */
  onClose: () => void;
  /** Heading rendered in the modal header. Used for aria-labelledby. */
  title: string;
  /** Sizes pin a max-width: sm 400, md 560, lg 720. Always shrinks to viewport. */
  size?: ModalSize;
  /** Modal body — the actual content the user reads. */
  children: ReactNode;
  /** Optional footer row, typically buttons. Renders below body with hairline. */
  footer?: ReactNode;
  /** Click on the backdrop closes the modal (default true). Set false for
      destructive confirmations where the user must explicitly cancel. */
  closeOnBackdrop?: boolean;
  /** Optional dark surface variant. Renders the card on graphite-ink with
      warm-white text; used to escalate destructive moments (revoke API
      key, delete org, etc.) — the surface change carries the gravity. */
  surface?: "light" | "dark";
}

export function Modal({
  open,
  onClose,
  title,
  size = "md",
  children,
  footer,
  closeOnBackdrop = true,
  surface = "light",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  /* Sync controlled `open` prop with the native dialog's open state.
     showModal() adds focus trap + body scroll lock; close() removes them. */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  /* Backdrop click: clicks on the <dialog> element itself (not its children)
     mean the user clicked the backdrop. Inner content clicks bubble with a
     different target. */
  const handleClick = (e: ReactMouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdrop) return;
    if (e.target === dialogRef.current) onClose();
  };

  /* Escape key fires a cancel event on the native dialog. preventDefault
     stops the dialog from closing itself; we close it via the controlled
     prop chain so consumers can intercept (e.g. "are you sure?" guard). */
  const handleCancel = (e: SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="oga-modal"
      data-size={size}
      data-oga-surface={surface === "dark" ? "dark" : undefined}
      onClick={handleClick}
      onCancel={handleCancel}
      aria-labelledby={titleId}
    >
      <div className="oga-modal__inner">
        <header className="oga-modal__header">
          <h2 id={titleId} className="oga-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="oga-modal__close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div className="oga-modal__body">{children}</div>
        {footer ? <footer className="oga-modal__footer">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
