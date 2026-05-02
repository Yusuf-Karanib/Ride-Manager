import { useEffect, useMemo, useRef, type ReactElement } from "react";

/* -------------------------------------------------------------------------- */
/* Tier definitions — exported so the rest of the app can reuse them          */
/* -------------------------------------------------------------------------- */

export type VehicleTierId = "standard" | "premium" | "microbus";

export interface VehicleTier {
  id: VehicleTierId;
  label: string;
  /** Suggested-offer multiplier applied to the rider's base price. */
  multiplier: number;
  capacity: string;
  blurb: string;
  /** Compact inline SVG so the file is self-contained — no asset deps. */
  icon: (props: { className?: string }) => ReactElement;
}

export const VEHICLE_TIERS: VehicleTier[] = [
  {
    id: "standard",
    label: "Standard",
    multiplier: 1.0,
    capacity: "Up to 4",
    blurb: "Everyday sedan. Best price.",
    icon: ({ className }) => (
      <svg viewBox="0 0 64 32" className={className} aria-hidden="true">
        <path
          d="M4 24h56v-6l-8-1-6-9H18l-6 9-8 1v6z"
          fill="currentColor"
          stroke="#000"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="26" r="4" fill="#000" />
        <circle cx="46" cy="26" r="4" fill="#000" />
      </svg>
    ),
  },
  {
    id: "premium",
    label: "Premium (A/C)",
    multiplier: 1.4,
    capacity: "Up to 4",
    blurb: "Newer car, working A/C.",
    icon: ({ className }) => (
      <svg viewBox="0 0 64 32" className={className} aria-hidden="true">
        <path
          d="M4 24h56v-7l-9-1-7-10H20l-7 10-9 1v7z"
          fill="currentColor"
          stroke="#000"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M22 16h20" stroke="#000" strokeWidth="2" />
        <circle cx="18" cy="26" r="4" fill="#000" />
        <circle cx="46" cy="26" r="4" fill="#000" />
      </svg>
    ),
  },
  {
    id: "microbus",
    label: "Microbus",
    multiplier: 1.8,
    capacity: "Up to 12",
    blurb: "Group rides & cargo.",
    icon: ({ className }) => (
      <svg viewBox="0 0 64 32" className={className} aria-hidden="true">
        <path
          d="M4 26V8h44l12 8v10H4z"
          fill="currentColor"
          stroke="#000"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M14 10h12v10H14zM30 10h12v10H30zM46 12h8l4 6h-12z" stroke="#000" strokeWidth="1.5" fill="rgba(255,255,255,0.4)" />
        <circle cx="18" cy="28" r="4" fill="#000" />
        <circle cx="50" cy="28" r="4" fill="#000" />
      </svg>
    ),
  },
];

const TIER_BY_ID: Record<VehicleTierId, VehicleTier> = Object.fromEntries(
  VEHICLE_TIERS.map((t) => [t.id, t]),
) as Record<VehicleTierId, VehicleTier>;

/* -------------------------------------------------------------------------- */
/* Pure helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Round to the nearest 500 SYP — typical bill denomination. */
function roundFare(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount / 500) * 500;
}

/** Apply a tier's multiplier to a base SYP offer. */
export function applyTierMultiplier(
  baseOffer: number,
  tierId: VehicleTierId,
): number {
  const tier = TIER_BY_ID[tierId];
  if (!tier) return baseOffer;
  return roundFare(baseOffer * tier.multiplier);
}

function formatSyp(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount) + " SYP";
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export interface VehicleSelectionProps {
  /** The rider's base/typed offer in SYP — the multiplier is applied to this. */
  baseOffer: number;
  /** Currently selected tier; controlled. */
  value: VehicleTierId;
  /**
   * Called whenever the rider picks a tier.
   * `adjustedOffer` is `applyTierMultiplier(baseOffer, tierId)`.
   */
  onChange: (tierId: VehicleTierId, adjustedOffer: number) => void;
  className?: string;
}

export default function VehicleSelection({
  baseOffer,
  value,
  onChange,
  className,
}: VehicleSelectionProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<VehicleTierId, HTMLButtonElement | null>>({
    standard: null,
    premium: null,
    microbus: null,
  });

  // Keep the selected tier centered in the scroll viewport on change.
  useEffect(() => {
    const el = cardRefs.current[value];
    if (el && "scrollIntoView" in el) {
      el.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [value]);

  const adjustedByTier = useMemo(() => {
    return Object.fromEntries(
      VEHICLE_TIERS.map((t) => [t.id, applyTierMultiplier(baseOffer, t.id)]),
    ) as Record<VehicleTierId, number>;
  }, [baseOffer]);

  const handleSelect = (tier: VehicleTier) => {
    onChange(tier.id, adjustedByTier[tier.id]);
  };

  return (
    <section className={`w-full ${className ?? ""}`} aria-label="Vehicle type">
      <div className="flex items-baseline justify-between px-1 mb-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-black/60">
          Vehicle Type
        </h3>
        <p className="text-[10px] font-mono text-black/50">
          Base · {formatSyp(roundFare(baseOffer))}
        </p>
      </div>

      <div
        ref={scrollerRef}
        role="radiogroup"
        aria-label="Vehicle type"
        className="
          flex gap-3 overflow-x-auto snap-x snap-mandatory
          pb-2 px-1 -mx-1
          scroll-smooth
          [scrollbar-width:none]
          [-ms-overflow-style:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        {VEHICLE_TIERS.map((tier) => {
          const isActive = tier.id === value;
          const adjusted = adjustedByTier[tier.id];
          return (
            <button
              key={tier.id}
              ref={(el) => {
                cardRefs.current[tier.id] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => handleSelect(tier)}
              className={`
                flex-none w-[180px] snap-center
                flex flex-col items-stretch text-left
                border-2 border-black
                transition-transform active:scale-[0.98]
                ${
                  isActive
                    ? "bg-yellow-400 text-black shadow-[4px_4px_0_0_#000] -translate-y-0.5"
                    : "bg-white text-black hover:bg-yellow-50"
                }
              `}
            >
              <div
                className={`flex items-center justify-center h-16 border-b-2 border-black ${
                  isActive ? "bg-yellow-300" : "bg-gray-50"
                }`}
              >
                <tier.icon
                  className={`h-10 ${isActive ? "text-black" : "text-black/80"}`}
                />
              </div>

              <div className="px-3 pt-2 pb-3 flex-1 flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold uppercase tracking-wider truncate">
                    {tier.label}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1 border ${
                      isActive
                        ? "border-black bg-black text-yellow-400"
                        : "border-black/40 text-black/60"
                    }`}
                  >
                    ×{tier.multiplier.toFixed(1)}
                  </span>
                </div>
                <p className="text-[10px] text-black/60">{tier.capacity}</p>
                <p className="text-[11px] text-black/70 leading-tight">
                  {tier.blurb}
                </p>
                <div className="mt-auto pt-1 border-t border-black/20">
                  <p className="text-[9px] uppercase tracking-widest text-black/50">
                    Suggested offer
                  </p>
                  <p className="text-base font-bold font-mono tabular-nums">
                    {formatSyp(adjusted)}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-center gap-1.5 mt-1" aria-hidden="true">
        {VEHICLE_TIERS.map((tier) => (
          <span
            key={tier.id}
            className={`block h-1 w-4 border border-black ${
              tier.id === value ? "bg-black" : "bg-white"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
