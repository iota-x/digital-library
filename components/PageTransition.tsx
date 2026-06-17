"use client";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Soft cross-fade between routes so navigation feels like one continuous
 * experience instead of hard page swaps. Keyed on the pathname so each route
 * replays the entrance; ScrollToTop resets scroll first, so the new page
 * always fades in from the top.
 *
 * Opacity-only on purpose: a transform here would create a containing block
 * and break any `position: fixed` descendants inside a page.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
