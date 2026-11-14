import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

// Textarea renders a multiline text input with label and validation feedback.
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = "", id, rows = 4, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-neutral-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-sage-600/15 focus:border-sage-600 disabled:bg-neutral-50 disabled:text-neutral-500 ${
            error
              ? "border-rose-400 bg-rose-50/20 text-rose-900"
              : "border-neutral-200 hover:border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500"
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-neutral-500">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
