"use client";
import { useState, type ReactNode, type CSSProperties } from "react";
import CuteTooltip from "@/components/CuteTooltip";

/**
 * Drop-in hover/focus tooltip wrapper. Wrap any control and it shows a cute
 * little label on hover (and keyboard focus). Pass `style` to take over the
 * trigger's positioning when wrapping an absolutely-positioned button.
 */
export default function Tip({
  label, placement = "top", children, style,
}: {
  label: ReactNode;
  placement?: "top" | "left" | "right";
  children: ReactNode;
  style?: CSSProperties;
}) {
  const [show, setShow] = useState(false);
  return (
    <span
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      style={{ position: "relative", display: "inline-flex", ...style }}
    >
      {children}
      <CuteTooltip show={show} label={label} placement={placement} />
    </span>
  );
}
