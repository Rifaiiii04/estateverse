import React from "react";

interface AlertProps {
  type?: "error" | "warning" | "success" | "info";
  message: string;
  className?: string;
}

// Alert renders contextual feedback banners for errors, warnings, and success messages.
export function Alert({ type = "error", message, className = "" }: AlertProps) {
  if (!message) return null;

  const styles = {
    error: "bg-rose-50 border-rose-200 text-rose-800",
    warning: "bg-neutral-100 border-neutral-300 text-neutral-900",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  }[type];

  return (
    <div
      role="alert"
      className={`p-3.5 rounded-lg border text-sm flex items-start gap-2.5 ${styles} ${className}`}
    >
      <span className="font-medium flex-1">{message}</span>
    </div>
  );
}
