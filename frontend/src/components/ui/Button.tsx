import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

// Button renders accessible interactive buttons with unified 60-30-10 styling variants.
export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold transition-all rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-600/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const sizeStyles = {
    sm: "h-9 px-3.5 text-xs gap-1.5",
    md: "h-10 px-4 text-xs sm:text-sm gap-2",
    lg: "h-11 px-6 text-sm gap-2.5",
  }[size];

  const variantStyles = {
    primary:
      "bg-sage-600 hover:bg-sage-700 text-white border border-transparent shadow-2xs",
    secondary:
      "bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200/80 shadow-2xs",
    outline:
      "border border-neutral-200 hover:border-sage-600 hover:bg-sage-50/50 text-neutral-800 hover:text-sage-800 bg-white shadow-2xs",
    danger:
      "bg-rose-600 hover:bg-rose-700 text-white border border-transparent shadow-2xs",
    ghost:
      "text-neutral-600 hover:bg-sage-50 hover:text-sage-700 border border-transparent",
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
