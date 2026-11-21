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

// ToastItemView renders an individual animated notification card with type-specific icon and style.
function ToastItemView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-neutral-800 shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-neutral-800 shrink-0 mt-0.5" />,
  };

  const borders = {
    success: "border-emerald-200 bg-white/95 text-slate-800 shadow-emerald-500/10",
    error: "border-rose-200 bg-white/95 text-slate-800 shadow-rose-500/10",
    warning: "border-neutral-300 bg-white/95 text-neutral-900 shadow-neutral-500/10",
    info: "border-neutral-200 bg-white/95 text-neutral-900 shadow-neutral-500/10",
  };

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 w-80 sm:w-96 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 ease-out transform translate-y-0 ${borders[item.type]}`}
    >
      {icons[item.type]}
      <div className="flex-1 space-y-0.5 text-xs">
        {item.title && <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>}
        <p className="text-slate-600 leading-relaxed font-normal">{item.message}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onDismiss(item.id)}
        className="text-muted-foreground"
        aria-label="Tutup notifikasi"
      >
        <X />
      </Button>
    </div>
  );
}

// ToastContainer renders the fixed floating stack for active toast notifications.
function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 pointer-events-none max-w-full px-4 sm:px-0"
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
