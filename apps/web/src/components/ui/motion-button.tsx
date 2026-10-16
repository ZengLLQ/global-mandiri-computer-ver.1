"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface MotionButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "outline" | "accent";
  children: React.ReactNode;
  className?: string;
}

export function MotionButton({
  variant = "primary",
  children,
  className,
  ...props
}: MotionButtonProps) {
  const baseClasses = "relative inline-flex items-center justify-center font-bold uppercase tracking-[0.1em] text-xs transition-colors cursor-pointer select-none rounded-full";
  
  const variantClasses = {
    primary: "bg-[var(--text-primary)] text-white border border-[var(--text-primary)] hover:bg-black hover:text-white",
    outline: "bg-transparent text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--text-primary)] hover:bg-[var(--bg-card)]",
    accent: "bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-black hover:text-white",
  };

  return (
    <motion.button
      whileHover={{
        y: -2,
        scale: 1.01,
        transition: { type: "spring", stiffness: 400, damping: 25 },
      }}
      whileTap={{
        y: 1,
        scale: 0.97,
        transition: { type: "spring", stiffness: 500, damping: 15 },
      }}
      className={cn(baseClasses, variantClasses[variant], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
