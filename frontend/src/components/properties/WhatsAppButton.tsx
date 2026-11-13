import React from "react";
import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/utils/whatsapp";
import { Button } from "@/components/ui/Button";

interface WhatsAppButtonProps {
  phone: string;
  propertyTitle: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// WhatsAppButton renders an accessible call-to-action link to chat directly with the seller.
export function WhatsAppButton({
  phone,
  propertyTitle,
  size = "md",
  className = "",
}: WhatsAppButtonProps) {
  const href = buildWhatsAppLink(phone, propertyTitle);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block ${className}`}
    >
      <Button
        variant="primary"
        size={size}
        className="w-full bg-sage-600 hover:bg-sage-700 focus:ring-sage-600 font-semibold shadow-sm gap-2"
      >
        <MessageCircle className="w-5 h-5" />
        <span>Hubungi Seller via WhatsApp</span>
      </Button>
    </a>
  );
}
