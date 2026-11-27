import React from "react";
import type { LucideIcon } from "lucide-react";

interface SettingsSectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  description?: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}

// SettingsSection frames one group of account settings as a titled card.
export function SettingsSection({ id, title, icon: Icon, description, tone = "default", children }: SettingsSectionProps) {
  const frame = tone === "danger" ? "border-rose-200" : "border-neutral-200/80";
  const iconColor = tone === "danger" ? "text-rose-600" : "text-sage-600";
  return (
    <section aria-labelledby={id} className={`bg-white rounded-2xl border ${frame} p-5 sm:p-6 space-y-4`}>
      <div className="space-y-1">
        <h2 id={id} className="flex items-center gap-2 text-base font-bold text-neutral-950">
          <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" /> {title}
        </h2>
        {description && <p className="text-sm text-neutral-700">{description}</p>}
      </div>
      {children}
    </section>
  );
}
