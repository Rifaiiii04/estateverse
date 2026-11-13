import React from "react";
import { PropertyStatus } from "@/types/property";

interface BadgeProps {
  status?: PropertyStatus;
  children?: React.ReactNode;
  variant?: "success" | "warning" | "neutral" | "info";
}

// Badge renders contextual status chips with distinct color semantics.
export function Badge({ status, children, variant }: BadgeProps) {
  let badgeClasses = "bg-neutral-100 text-neutral-700 border-neutral-200";
  let label = children;

  if (status === "published" || variant === "success") {
    badgeClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
    label = label || "Published";
  } else if (status === "draft" || variant === "warning") {
    badgeClasses = "bg-neutral-100 text-neutral-800 border-neutral-200";
    label = label || "Draft";
  } else if (variant === "info") {
    badgeClasses = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClasses}`}
    >
      {label}
    </span>
  );
}
