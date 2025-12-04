"use client";

import React, { forwardRef } from "react";

type Align = "left" | "center" | "right";
type TextBlock = {
  id: string;
  label?: string;
  value: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight?: number;
  color?: string;
  align?: Align;
  maxWidth?: number; // optional wrapping width (for description)
};

type Props = {
  width: number;
  height: number;
  backgroundImage?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  textBlocks: TextBlock[];
};

export const CertificateCanvas = forwardRef<HTMLDivElement, Props>(function CertificateCanvas(
  { width, height, backgroundImage, backgroundColor = "#ffffff", showGrid = false, textBlocks },
  ref
) {
  // A fixed-size canvas-like div, scaled by parent if needed (no zoom)
  // We render text absolutely positioned according to given coordinates.
  return (
    <div
      ref={ref}
      className="relative"
      style={{
        width,
        height,
        backgroundColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.06) inset",
      }}
    >
      {showGrid && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            pointerEvents: "none",
          }}
        />
      )}

      {textBlocks.map((t) => {
        const style: React.CSSProperties = {
          position: "absolute",
          left: t.align === "center" ? t.x : t.align === "right" ? t.x : t.x,
          top: t.y,
          transform:
            t.align === "center" ? "translate(-50%, -50%)" :
            t.align === "right" ? "translate(-100%, -50%)" :
            "translate(0, -50%)",
          fontSize: t.fontSize,
          fontWeight: t.fontWeight || 500,
          color: t.color || "#111827",
          whiteSpace: t.maxWidth ? "normal" : "nowrap",
          textAlign: t.align || "left",
          maxWidth: t.maxWidth ? `${t.maxWidth}px` : undefined,
          lineHeight: 1.2,
          wordBreak: "break-word",
        };

        return (
          <div key={t.id} style={style}>
            {t.value}
          </div>
        );
      })}
    </div>
  );
});
