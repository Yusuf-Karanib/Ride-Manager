import { MAX_CONCURRENT_SHARED_RIDES } from "@/lib/api";

/* -------------------------------------------------------------------------- */
/* Rider-side toggle                                                          */
/* -------------------------------------------------------------------------- */

export interface CarpoolToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * "Share My Ride" toggle for the RiderScreen.
 *
 * Sets `rides.is_shared = true` when checked. Drivers see these as
 * highlighted requests in their feed and may accept up to
 * MAX_CONCURRENT_SHARED_RIDES of them concurrently (enforcement happens
 * server-side at bid acceptance, not here).
 */
export default function CarpoolToggle({
  value,
  onChange,
  disabled,
  className,
}: CarpoolToggleProps) {
  return (
    <section
      className={`border-2 border-black ${
        value ? "bg-yellow-400" : "bg-white"
      } ${className ?? ""}`}
      aria-labelledby="carpool-toggle-label"
    >
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-labelledby="carpool-toggle-label"
        aria-describedby="carpool-toggle-desc"
        disabled={disabled}
        onClick={() => onChange(!value)}
        className="w-full flex items-center gap-3 px-3 py-3 text-left disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-[1px]"
      >
        {/* Brutalist 2-position switch */}
        <span
          className="relative shrink-0 w-12 h-7 border-2 border-black bg-white"
          aria-hidden="true"
        >
          <span
            className={`absolute top-0 bottom-0 w-5 border-2 border-black transition-all duration-150 ease-out ${
              value ? "right-0 bg-black" : "left-0 bg-gray-300"
            }`}
          />
        </span>

        <span className="flex-1 min-w-0">
          <span
            id="carpool-toggle-label"
            className="block text-sm font-bold uppercase tracking-wider text-black"
          >
            Share My Ride
          </span>
          <span
            id="carpool-toggle-desc"
            className="block text-[11px] text-black/70 leading-tight mt-0.5"
          >
            {value
              ? "Driver may pick up other riders going your way."
              : "Just you in the car."}
          </span>
        </span>

        {value && (
          <span className="shrink-0 px-1.5 py-0.5 bg-black text-yellow-400 text-[10px] font-bold uppercase tracking-widest">
            On
          </span>
        )}
      </button>

      {value && (
        <div className="border-t-2 border-black bg-white text-black px-3 py-2 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">
            What this means
          </p>
          <ul className="text-[11px] leading-tight space-y-1 list-disc pl-4 text-black/80">
            <li>
              Up to {MAX_CONCURRENT_SHARED_RIDES} riders may share the car.
            </li>
            <li>The driver may add stops along the way.</li>
            <li>
              Your fare is still your initial offer — no automatic split.
            </li>
            <li>You still pay the driver in cash at the end.</li>
          </ul>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Driver-side helpers (visual highlight)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Compact badge for highlighting shared rides in the driver feed.
 * Drop into any ride card when `ride.is_shared === true`.
 */
export function SharedRideBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 border-2 border-black bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-widest ${
        className ?? ""
      }`}
      aria-label="Shared ride"
      title="Shared ride — multiple riders may share this trip"
    >
      <SharedIcon />
      Shared
    </span>
  );
}

function SharedIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="11"
      height="11"
      aria-hidden="true"
      fill="currentColor"
    >
      <circle cx="5" cy="5" r="2.5" />
      <circle cx="11" cy="5" r="2.5" />
      <path d="M1 14c0-2.2 1.8-4 4-4s4 1.8 4 4H1zm6 0c0-2.2 1.8-4 4-4s4 1.8 4 4H7z" />
    </svg>
  );
}

/**
 * Helper to compute the row-level styling for a shared vs solo ride card
 * in the driver feed. Centralizes the visual treatment so future tweaks
 * happen in one place.
 */
export function sharedRideRowClassName(isShared: boolean): string {
  return isShared
    ? "border-2 border-black bg-yellow-50 shadow-[3px_3px_0_0_#000]"
    : "border-2 border-black bg-white";
}
