import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";

interface LayoutProps {
  children: ReactNode;
  /**
   * If true, omit the bottom nav. Useful for screens that need full-bleed
   * height (in-trip, auth) but still benefit from the layout shell.
   */
  hideNav?: boolean;
}

/**
 * Global layout shell. Reserves `pb-16` so screen content does not slide
 * under the fixed-position BottomNav (h-16). Screens that opt into Layout
 * should NOT use `h-screen` themselves — they should size to content and
 * let Layout's `min-h-screen` cover the viewport. Screens that need
 * full-bleed pixel control (RiderScreen with map, ActiveRideScreen) stay
 * outside Layout entirely.
 */
export default function Layout({ children, hideNav = false }: LayoutProps) {
  return (
    <div className={`min-h-screen ${hideNav ? "" : "pb-16"}`}>
      {children}
      {!hideNav && <BottomNav />}
    </div>
  );
}
