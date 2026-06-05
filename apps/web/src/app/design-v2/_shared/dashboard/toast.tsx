/* AR-222 (Dashboard redesign Epic AR-217): non-blocking notification primitive.

   Surfaces async outcomes (preset saved, member removed, key copied to
   clipboard) and errors (403 admin_required, IP not allowed) without
   blocking the user. Corner-anchored bottom-right, stacks (newest on top),
   auto-dismisses with a timer that pauses on hover.

   Composition model: <ToastProvider> wraps the app once (or the consumer
   page); children call useToast() to fire toasts from anywhere. Toasts
   render via React portal to document.body so they always sit above any
   z-index stacking context.

   4 variants — success / info / warning / error — using the Brand v3
   .oga-status-* palette. The status color appears in the icon + a thin
   accent stripe on the left edge; the card body stays warm-white with a
   hairline border for editorial consistency. */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import "./toast.css";

export type ToastVariant = "success" | "info" | "warning" | "error";

export interface ToastAction {
  /** Action label rendered as a small button on the right side of the body. */
  label: string;
  /** Click handler. Toast dismisses after the handler runs. */
  onClick: () => void;
}

export interface ToastOptions {
  /** Color + icon variant. Default "info". */
  variant?: ToastVariant;
  /** Headline. Required — the primary message. */
  title: string;
  /** Optional supporting line below the title. */
  body?: string;
  /** ms before auto-dismiss. 0 disables auto-dismiss (sticky toast).
      Default 5000ms. */
  duration?: number;
  /** Optional action button (e.g. "Undo"). Action click dismisses the toast. */
  action?: ToastAction;
}

interface ToastRecord extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  /** Fire a toast. Returns the toast's id for programmatic dismiss. */
  toast: (opts: ToastOptions) => string;
  /** Dismiss a specific toast by id. */
  dismiss: (id: string) => void;
  /** Dismiss all visible toasts. */
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Hook for any client component under <ToastProvider>. Returns the
    toast control functions. Throws if used outside the provider. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be called inside <ToastProvider>");
  }
  return ctx;
}

interface ToastProviderProps {
  children: ReactNode;
  /** Maximum number of visible toasts at once. Older toasts dismiss when
      a new one would exceed this. Default 5. */
  max?: number;
}

export function ToastProvider({ children, max = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const idCounter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = useCallback(
    (opts: ToastOptions): string => {
      idCounter.current += 1;
      const id = `toast-${idCounter.current}`;
      const record: ToastRecord = { id, variant: "info", duration: 5000, ...opts };
      setToasts((current) => {
        const next = [record, ...current];
        return next.length > max ? next.slice(0, max) : next;
      });
      return id;
    },
    [max],
  );

  const value = useMemo(() => ({ toast, dismiss, dismissAll }), [toast, dismiss, dismissAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/* ============================================================
   Viewport — portals stacked toasts to document.body
   ============================================================ */

interface ToastViewportProps {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}

function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  const [mounted, setMounted] = useState(false);

  /* Standard SSR-safety pattern: render nothing on first paint (server +
     client first render match), then flip on first useEffect tick to
     mount the portal. Avoids hydration mismatch. The setState here is a
     one-shot mount marker, not a cascade. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="oga-toast-viewport"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

/* ============================================================
   Toast card — single notification
   ============================================================ */

interface ToastCardProps {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const [paused, setPaused] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();

  const duration = toast.duration ?? 5000;
  const variant = toast.variant ?? "info";

  /* Auto-dismiss after duration. Pause when hovered. Reset on each
     pause/resume cycle to give the user the full duration after they
     stop hovering — matches Linear's UX. */
  useEffect(() => {
    if (duration <= 0 || paused) return;
    const handle = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(handle);
  }, [toast.id, duration, paused, onDismiss]);

  /* Escape on a focused toast dismisses it. */
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss(toast.id);
      }
    }
    el.addEventListener("keydown", handleKey);
    return () => el.removeEventListener("keydown", handleKey);
  }, [toast.id, onDismiss]);

  const handleActionClick = () => {
    toast.action?.onClick();
    onDismiss(toast.id);
  };

  /* aria-live: warning/error are assertive (interrupt screen reader),
     success/info are polite (announce at next pause). role="alert" on
     assertive variants per WAI-ARIA Authoring Practices. */
  const isAssertive = variant === "warning" || variant === "error";

  return (
    <div
      ref={cardRef}
      className="oga-toast"
      data-variant={variant}
      role={isAssertive ? "alert" : "status"}
      aria-live={isAssertive ? "assertive" : "polite"}
      aria-atomic="true"
      aria-labelledby={titleId}
      aria-describedby={toast.body ? bodyId : undefined}
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="oga-toast__icon" aria-hidden="true">
        <ToastIcon variant={variant} />
      </span>
      <div className="oga-toast__body">
        <p id={titleId} className="oga-toast__title">
          {toast.title}
        </p>
        {toast.body ? (
          <p id={bodyId} className="oga-toast__text">
            {toast.body}
          </p>
        ) : null}
      </div>
      {toast.action ? (
        <button
          type="button"
          className="oga-toast__action"
          onClick={handleActionClick}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        className="oga-toast__close"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M3 3l6 6M9 3l-6 6"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

/* ============================================================
   Variant icons — simple, brand-consistent glyphs
   ============================================================ */

function ToastIcon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case "success":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "warning":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5L15 14H1L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M8 6v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="12" r="0.7" fill="currentColor" />
        </svg>
      );
    case "error":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "info":
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="5" r="0.7" fill="currentColor" />
          <path d="M8 7.5v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
  }
}
