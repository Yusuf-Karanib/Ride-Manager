import { Link, useLocation } from "wouter";
import { Home, ListChecks, User } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/activity", label: "Activity", Icon: ListChecks },
  { href: "/profile", label: "Account", Icon: User },
];

/**
 * Match logic: exact match for "/", prefix match for everything else.
 * Avoids "/" lighting up on every route via prefix-match.
 */
function isActive(current: string, href: string): boolean {
  if (href === "/") return current === "/";
  return current === href || current.startsWith(href + "/");
}

export interface BottomNavProps {
  className?: string;
}

/**
 * Fixed bottom navigation bar. Brutalist palette: black bar, white
 * inactive, Sulfur (#EAFF00) active. 2px Sulfur top border for the
 * brand-consistent edge against light screens above.
 *
 * Mounting: this is NOT auto-mounted in App.tsx. Existing full-bleed
 * `h-screen` screens (RiderScreen, ServicesHub) need a `pb-16` (or
 * equivalent) added to their bottom-most container before this bar can
 * be mounted globally without overlapping submit buttons / inputs.
 *
 * Routes: links target /activity and /profile, neither of which is
 * registered in App.tsx today. Tapping those tabs will fall through to
 * the default route. Stub those screens before relying on this nav.
 */
export default function BottomNav({ className = "" }: BottomNavProps) {
  const [location] = useLocation();

  return (
    <nav
      role="navigation"
      aria-label="Primary"
      className={`fixed bottom-0 left-0 right-0 z-50 bg-black border-t-2 border-[#EAFF00] flex h-16 ${className}`}
    >
      {ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(location, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EAFF00] ${
              active ? "text-[#EAFF00]" : "text-white"
            }`}
          >
            <Icon aria-hidden className="w-5 h-5" strokeWidth={2.5} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
