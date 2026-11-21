import React from "react";
import { buildWhatsAppLink } from "@/lib/utils/whatsapp";
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
  const href = buildWhatsAppLink(phone, propertyTitle);

  return (
    <Button
      size={size}
      className={cn("px-4", className)}
      render={<a href={href} target="_blank" rel="noopener noreferrer" />}
    >
      <WhatsAppIcon />
      <span>Hubungi Seller via WhatsApp</span>
    </Button>
  );
}
