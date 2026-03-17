"use client";

import { createContext, useCallback, useContext, useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { generateId } from "@/lib/id";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  exiting: boolean;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 3;

const typeStyles: Record<ToastType, { borderColor: string; bg: string }> = {
  success: { borderColor: "var(--neon-green)", bg: "var(--neon-green-dim)" },
  error: { borderColor: "var(--neon-red)", bg: "var(--neon-red-dim)" },
  info: { borderColor: "var(--accent)", bg: "var(--accent-dim)" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismiss = useCallback((id: string) => {
    // Mark as exiting for fade-out animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    // Remove after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
    // Clean up timer
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = generateId("toast", 8);
      const toast: Toast = { id, type, message, exiting: false };

      setToasts((prev) => {
        const next = [...prev, toast];
        // If exceeding max, dismiss the oldest
        if (next.length > MAX_TOASTS) {
          const oldest = next[0];
          setTimeout(() => dismiss(oldest.id), 0);
        }
        return next;
      });

      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => dismiss(id), 3000);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const contextValue: ToastContextValue = {
    success: useCallback((msg: string) => addToast("success", msg), [addToast]),
    error: useCallback((msg: string) => addToast("error", msg), [addToast]),
    info: useCallback((msg: string) => addToast("info", msg), [addToast]),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast container */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          const styles = typeStyles[toast.type];
          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderLeft: `3px solid ${styles.borderColor}`,
                backgroundColor: styles.bg,
                minWidth: 240,
                maxWidth: 360,
                animation: toast.exiting
                  ? "toastOut 0.2s ease-in forwards"
                  : "toastIn 0.25s ease-out forwards",
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--text-primary)",
                  lineHeight: 1.4,
                }}
              >
                {toast.message}
              </span>
              <button
                onClick={() => dismiss(toast.id)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 2,
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
