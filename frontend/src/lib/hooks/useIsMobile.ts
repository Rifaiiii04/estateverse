"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

// Reports whether the viewport is narrower than the tablet breakpoint.
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    // Syncs the flag with the current viewport width.
    const handleChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    query.addEventListener("change", handleChange);
    handleChange();
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return Boolean(isMobile);
}
