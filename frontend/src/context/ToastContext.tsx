"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  dismissToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/** Solid colour per toast type so the meaning reads at a glance: green success, red error, amber warning, blue info. */
const TOAST_STYLES: Record<ToastType, { surface: string; icon: React.ReactNode }> = {
  success: { surface: "bg-sage-600 text-white shadow-sage-900/25", icon: <CheckCircle2 aria-hidden="true" /> },
  error: { surface: "bg-rose-600 text-white shadow-rose-900/25", icon: <AlertCircle aria-hidden="true" /> },
  warning: { surface: "bg-amber-400 text-neutral-950 shadow-amber-900/20", icon: <AlertTriangle aria-hidden="true" /> },
  info: { surface: "bg-sky-700 text-white shadow-sky-900/25", icon: <Info aria-hidden="true" /> },
};

// ToastItemView renders one coloured notification; full width on phones, a fixed-width card on wider screens.
function ToastItemView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const style = TOAST_STYLES[item.type];
  return (
    <div
      role={item.type === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex items-start gap-3 w-full md:w-96 p-4 rounded-xl shadow-xl transition-all duration-300 ease-out ${style.surface}`}
    >
      <span className="shrink-0 mt-0.5 [&_svg]:size-5">{style.icon}</span>
      <div className="flex-1 min-w-0 space-y-0.5 text-[13px] md:text-xs">
        {item.title && <h4 className="font-bold text-sm">{item.title}</h4>}
        <p className="leading-relaxed font-medium opacity-95">{item.message}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onDismiss(item.id)}
        className="text-current opacity-80 hover:opacity-100 hover:bg-black/10 hover:text-current"
        aria-label="Tutup notifikasi"
      >
        <X />
      </Button>
    </div>
  );
}

// ToastContainer renders the notification stack: edge to edge above the bottom of phones, bottom-right on wider screens.
function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 flex flex-col gap-2 pointer-events-none md:inset-x-auto md:right-5 md:bottom-5 md:gap-2.5"
    >
      {toasts.map((item) => (
        <ToastItemView key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ToastProvider manages toast notification state, timeouts, and renders the notification layer.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", title?: string, duration: number = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, message, title, type, duration };
      setToasts((prev) => [...prev.slice(-4), newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const toast = useMemo(
    () => ({
      success: (msg: string, title?: string, dur?: number) => showToast(msg, "success", title, dur),
      error: (msg: string, title?: string, dur?: number) => showToast(msg, "error", title, dur),
      warning: (msg: string, title?: string, dur?: number) => showToast(msg, "warning", title, dur),
      info: (msg: string, title?: string, dur?: number) => showToast(msg, "info", title, dur),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// useToast provides access to the global toast notification dispatcher.
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
