import React from "react";

// LoadingSpinner displays a centered animated spinner and optional caption.
export function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 gap-3"
      suppressHydrationWarning
    >
      <div className="w-8 h-8 border-3 border-neutral-900 border-t-transparent rounded-full animate-spin" />
      {text && (
        <p className="text-sm font-medium text-neutral-500" suppressHydrationWarning>
          {text}
        </p>
      )}
    </div>
  );
}
