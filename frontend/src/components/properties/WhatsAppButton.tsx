import React from "react";
import { buildWhatsAppLink, isDemoWhatsApp } from "@/lib/utils/whatsapp";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";

interface WhatsAppButtonProps {
  phone: string;
  propertyTitle: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}

// WhatsAppButton renders an accessible call-to-action link to chat directly with the seller.
export function WhatsAppButton({
  phone,
  propertyTitle,
  size = "default",
  className = "",
}: WhatsAppButtonProps) {
  if (isDemoWhatsApp(phone)) {
    return (
      <div className="space-y-1">
        <Button size={size} className={cn("px-4", className)} disabled aria-describedby="wa-demo-note">
          <WhatsAppIcon />
          <span>WhatsApp Penjual Belum Tersedia</span>
        </Button>
        <p id="wa-demo-note" className="text-[11px] text-neutral-500 text-center">
          Ini listing contoh. Gunakan formulir survei di bawah untuk menitipkan pesan.
        </p>
      </div>
    );
  }

  return (
    <Button
      size={size}
      className={cn("px-4", className)}
      render={<a href={buildWhatsAppLink(phone, propertyTitle)} target="_blank" rel="noopener noreferrer" />}
    >
      <WhatsAppIcon />
      <span>Hubungi Seller via WhatsApp</span>
    </Button>
  );
}
