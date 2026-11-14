"use client";

import React from "react";
import { MotionConfig } from "framer-motion";

// MotionProvider makes every animation respect the visitor's "reduce motion" accessibility setting.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
