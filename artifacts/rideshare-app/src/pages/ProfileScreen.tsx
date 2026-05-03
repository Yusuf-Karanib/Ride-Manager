import { MapPin, CreditCard, Settings, ChevronRight, LogOut } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

interface ProfileScreenProps {
  /** Display name. Defaults to a placeholder. */
  name?: string;
  /** E.164-ish formatted phone string. */
  phone?: string;
  onLogout: () => void;
  /**
   * Optional row handlers. Omit (or leave undefined) to log a stub —
   * none of these destinations have routes yet, so wiring them here
   * would create dead links.
   */
  onOpenSavedLocations?: () => void;
  onOpenPaymentMethods?: () => void;
  onOpenSettings?: () => void;
}

interface MenuRow {
  key: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  onPress?: () => void;
}

export default function ProfileScreen({
  name = "Yusuf",
  phone = "+963 944 123 456",
  onLogout,
  onOpenSavedLocations,
  onOpenPaymentMethods,
  onOpenSettings,
}: ProfileScreenProps) {
  const rows: MenuRow[] = [
    {
      key: "saved-locations",
      label: "Saved Locations",
      Icon: MapPin,
      onPress: onOpenSavedLocations,
    },
    {
      key: "payment-methods",
      label: "Payment Methods",
      Icon: CreditCard,
      onPress: onOpenPaymentMethods,
    },
    {
      key: "settings",
      label: "Settings",
      Icon: Settings,
      onPress: onOpenSettings,
    },
  ];

  // Initial for the avatar placeholder. Falls back to a single space
  // (an empty avatar) rather than a "?" so the look stays clean if
  // name is somehow blank.
  const initial = name.trim().charAt(0).toUpperCase() || " ";

  return (
    <main className="min-h-screen w-full bg-white text-black">
      <header className="px-6 py-6 border-b-2 border-black flex items-center gap-4">
        <div
          aria-hidden="true"
          className="w-16 h-16 shrink-0 border-2 border-black bg-[#EAFF00] flex items-center justify-center text-2xl font-bold uppercase"
        >
          {initial}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold uppercase tracking-wider truncate">
            {name}
          </h1>
          <p className="mt-1 text-sm font-bold tabular-nums text-black/70">
            {phone}
          </p>
        </div>
      </header>

      <ul className="px-6 py-5 space-y-3" data-testid="profile-menu">
        {rows.map(({ key, label, Icon, onPress }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => {
                if (onPress) {
                  onPress();
                  return;
                }
                // Honest stub — no destination route exists yet. Surfacing
                // in console rather than silently no-op'ing.
                // eslint-disable-next-line no-console
                console.info(`[ProfileScreen] ${label} tapped — no route wired yet.`);
              }}
              className="w-full border-2 border-black bg-white px-4 py-4 flex items-center gap-3 hover:bg-yellow-50 active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EAFF00]"
            >
              <Icon aria-hidden className="w-5 h-5" strokeWidth={2.5} />
              <span className="flex-1 text-left text-sm font-bold uppercase tracking-wider">
                {label}
              </span>
              <ChevronRight aria-hidden className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </li>
        ))}
      </ul>

      <div className="px-6 pt-2 pb-6">
        <button
          type="button"
          onClick={onLogout}
          className="w-full bg-black text-[#EAFF00] border-2 border-black py-4 text-base font-bold uppercase tracking-[0.2em] hover:bg-[#0F172A] active:translate-y-[1px] flex items-center justify-center gap-2"
          data-testid="logout-button"
        >
          <LogOut aria-hidden className="w-5 h-5" strokeWidth={2.5} />
          Log out
        </button>
      </div>
    </main>
  );
}
