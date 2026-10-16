"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion, useSpring, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  tiltIntensity?: number; // default 10 degrees
  glareEffect?: boolean;
}

export function Card3D({
  children,
  className,
  tiltIntensity = 8,
  glareEffect = true,
  ...props
}: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for smooth cursor tracking
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Spring physics for buttery smooth 60-120fps motion
  const springConfig = { damping: 25, stiffness: 280, mass: 0.5 };
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [tiltIntensity, -tiltIntensity]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-tiltIntensity, tiltIntensity]), springConfig);
  const scale = useSpring(isHovered ? 1.015 : 1, springConfig);

  // Glare position
  const glareX = useTransform(mouseX, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(mouseY, [0, 1], ["0%", "100%"]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouseX.set(x);
      mouseY.set(y);
    },
    [mouseX, mouseY]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: "preserve-3d",
        perspective: 1200,
        rotateX,
        rotateY,
        scale,
      }}
      className={cn(
        "relative rounded-2xl overflow-hidden will-change-transform transition-shadow duration-300",
        isHovered ? "shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)]" : "shadow-none",
        className
      )}
      {...(props as any)}
    >
      {/* Main Card Content with 3D transform support */}
      <div
        style={{
          transformStyle: "preserve-3d",
        }}
        className="w-full h-full"
      >
        {children}
      </div>

      {/* Subtle Specular Glare Highlight (like light on matte metal) */}
      {glareEffect && isHovered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-20 pointer-events-none mix-blend-overlay overflow-hidden rounded-2xl"
          style={{
            background: `radial-gradient(circle 350px at ${mouseX.get() * 100}% ${mouseY.get() * 100}%, rgba(255, 255, 255, 0.7), transparent 75%)`,
          }}
        />
      )}
    </motion.div>
  );
}
