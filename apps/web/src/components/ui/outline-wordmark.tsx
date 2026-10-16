"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface OutlineWordmarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  text?: string;
  strokeWidth?: string;
  className?: string;
}

export function OutlineWordmark({
  children,
  text,
  strokeWidth = "1.5px",
  className = "",
  style,
  ...props
}: OutlineWordmarkProps) {
  const content = text || children;
  return (
    <span
      className={cn(
        "font-black uppercase tracking-tight transition-all duration-200 select-none",
        "outline-wordmark-wrapper group-hover:text-inherit",
        className
      )}
      style={{
        ...style,
      }}
      {...props}
    >
      <span
        className="outline-text-inner transition-colors duration-200"
        style={{
          WebkitTextStroke: `${strokeWidth} currentColor`,
          WebkitTextFillColor: "transparent",
        }}
      >
        {content}
      </span>
      <style jsx global>{`
        .group:hover .outline-text-inner {
          -webkit-text-stroke: 0px transparent !important;
          -webkit-text-fill-color: currentColor !important;
          color: currentColor !important;
        }
      `}</style>
    </span>
  );
}
