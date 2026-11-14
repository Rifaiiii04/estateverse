import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

// Input renders an accessible form input field with optional label and validation error.
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-neutral-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full h-10 px-3.5 rounded-xl border text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600 disabled:bg-neutral-50 disabled:text-neutral-500 ${
            error
              ? "border-rose-400 bg-rose-50/20 text-rose-900"
              : "border-neutral-200 hover:border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-500"
          } ${className}`}
          {...props}
        />
        {error && <p id={`${inputId}-error`} role="alert" className="text-xs text-rose-700 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-neutral-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
