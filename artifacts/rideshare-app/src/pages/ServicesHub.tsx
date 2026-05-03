import { type ReactNode } from "react";
import { Car, Bike, Bus, CarTaxiFront } from "lucide-react";
import LanguageToggle from "@/components/LanguageToggle";
import type { ServiceType } from "@/lib/api";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export type ServiceId =
  | "taxi"
  | "motorcycle"
  | "microbus"
  | "vip"
  | "package";

/**
 * Map a UI-level ServiceId to the persistent `rides.service_type` value.
 *
 * The DB vocabulary is intentionally narrower than the UI:
 *  - 'vip' collapses to 'taxi' (VIP is a tier multiplier, not a category)
 *  - 'package' has no DB home yet (delivery flow is not built); it returns
 *    null so callers must handle the unsupported case explicitly rather
 *    than silently writing a wrong value.
 *
 * Returning null instead of throwing keeps the callsite shape simple
 * (`const t = serviceIdToServiceType(id); if (!t) return ...`).
 */
export function serviceIdToServiceType(id: ServiceId): ServiceType | null {
  switch (id) {
    case "taxi":
    case "vip":
      return "taxi";
    case "motorcycle":
      return "bike";
    case "microbus":
      return "van";
    case "package":
      return null;
  }
}

export interface ServicesHubProps {
  /** Fired when a service tile is tapped. Parent owns navigation. */
  onSelect?: (id: ServiceId) => void;
  /** Optional back/close affordance in the header. Hidden if omitted. */
  onClose?: () => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Service catalog                                                            */
/* -------------------------------------------------------------------------- */

interface ServiceMeta {
  id: ServiceId;
  title: string;
  blurb: string;
  /** Small badge pinned to the card; null = no badge. */
  badge: string | null;
  Icon: () => ReactNode;
}

const RIDE_SERVICES: ServiceMeta[] = [
  {
    id: "taxi",
    title: "Standard Taxi",
    blurb: "City rides, metered pace",
    badge: null,
    Icon: () => <Car color="#EAFF00" size={40} strokeWidth={2} />,
  },
  {
    id: "motorcycle",
    title: "Motorcycle",
    blurb: "Quick, traffic-proof",
    badge: "Saves fuel",
    Icon: () => <Bike color="#EAFF00" size={40} strokeWidth={2} />,
  },
  {
    id: "microbus",
    title: "Microbus",
    blurb: "Shared servis routes",
    badge: "Cheapest",
    Icon: () => <Bus color="#EAFF00" size={40} strokeWidth={2} />,
  },
  {
    id: "vip",
    title: "VIP Car",
    blurb: "Sedan, A/C, top-rated",
    badge: null,
    Icon: () => <CarTaxiFront color="#EAFF00" size={40} strokeWidth={2} />,
  },
];

const DELIVERY_SERVICES: ServiceMeta[] = [
  {
    id: "package",
    title: "Package Delivery",
    blurb: "Send anything across town — handed driver-to-driver",
    badge: null,
    Icon: PackageIcon,
  },
];

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ServicesHub({
  onSelect,
  onClose,
  className,
}: ServicesHubProps) {
  return (
    <main
      className={`min-h-screen w-full bg-white text-black ${className ?? ""}`}
      aria-label="FAST24 services"
    >
      {/* Header — black bar with sulfur accent, matches the rest of the app */}
      <header className="bg-black text-white px-4 py-4 border-b-2 border-black flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
            FAST24
          </p>
          <h1 className="text-2xl font-bold uppercase tracking-wider mt-0.5">
            Services
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle variant="dark" />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close services"
              className="px-3 py-1.5 border-2 border-yellow-400 bg-transparent text-yellow-400 text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400 hover:text-black active:translate-y-[1px]"
            >
              Close
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-5 max-w-3xl mx-auto">
        {/* Section: Go anywhere */}
        <Section
          eyebrow="01"
          title="Go anywhere"
          subtitle="Pick a vehicle that fits your trip and your budget."
        />
        <ul
          className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3"
          role="list"
          aria-label="Ride services"
        >
          {RIDE_SERVICES.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onSelect={onSelect}
            />
          ))}
        </ul>

        {/* Section: Deliver anything */}
        <div className="mt-8">
          <Section
            eyebrow="02"
            title="Deliver anything"
            subtitle="Send a package across town. The WhatsApp 'pick this up' scenario, formalised."
          />
          <ul
            className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3"
            role="list"
            aria-label="Delivery services"
          >
            {DELIVERY_SERVICES.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onSelect={onSelect}
              />
            ))}
            {/* Placeholder slot to telegraph future delivery types (food,
                grocery, etc.) without faking the icons. */}
            <li className="hidden md:flex items-center justify-center border-2 border-dashed border-black/20 p-4 text-[11px] font-bold uppercase tracking-widest text-black/40 text-center">
              More services
              <br />
              coming soon
            </li>
          </ul>
        </div>

        {/* Footnote */}
        <p className="mt-6 text-[10px] text-black/50 leading-snug">
          Cash-only. Zero commission. Prices are negotiated directly with
          drivers — no surge pricing, ever.
        </p>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Section header                                                             */
/* -------------------------------------------------------------------------- */

interface SectionProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

function Section({ eyebrow, title, subtitle }: SectionProps) {
  return (
    <header>
      <p className="text-[10px] font-bold uppercase tracking-widest text-black/50">
        {eyebrow} · {subtitle}
      </p>
      <h2 className="text-xl font-bold uppercase tracking-wider text-black mt-0.5">
        {title}
      </h2>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Service card                                                               */
/* -------------------------------------------------------------------------- */

interface ServiceCardProps {
  service: ServiceMeta;
  onSelect?: (id: ServiceId) => void;
}

function ServiceCard({ service, onSelect }: ServiceCardProps) {
  const { id, title, blurb, badge, Icon } = service;
  // Premium emblem treatment applies to the four named ride services.
  // The package card keeps its existing SVG + square frame because the
  // prompt did not specify a lucide replacement for it.
  const isPremium = id !== "package";
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect?.(id)}
        aria-label={title}
        className={`group relative w-full h-full ${isPremium ? "text-center" : "text-left"} border-2 border-black bg-white p-3 hover:bg-yellow-400 active:translate-y-[1px] focus:outline-none focus:bg-yellow-400 transition-colors`}
      >
        {badge && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#0F172A] text-yellow-400 text-[9px] font-bold uppercase tracking-widest">
            {badge}
          </span>
        )}
        {isPremium ? (
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black border-2 border-yellow-400 shadow-xl mb-4 mx-auto">
            <Icon />
          </div>
        ) : (
          <div className="aspect-square w-full flex items-center justify-center bg-gray-50 border-2 border-black group-hover:bg-white">
            <Icon />
          </div>
        )}
        <p className="mt-2 text-[12px] font-bold uppercase tracking-wider text-black">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] text-black/60 leading-snug">{blurb}</p>
      </button>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Icons — Package keeps its inline SVG; the four ride services use lucide.   */
/* -------------------------------------------------------------------------- */

function PackageIcon() {
  return (
    <svg
      viewBox="0 0 64 48"
      width="56"
      height="42"
      aria-hidden="true"
      className="text-black"
    >
      {/* Box — isometric-ish */}
      <path
        d="M32 6 L56 14 L56 38 L32 46 L8 38 L8 14 Z"
        fill="#EAFF00"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      {/* Front face shading */}
      <path
        d="M32 22 L56 14 L56 38 L32 46 Z"
        fill="white"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      {/* Tape — vertical and horizontal */}
      <line x1="8" y1="14" x2="32" y2="22" stroke="currentColor" strokeWidth="2" />
      <line x1="32" y1="22" x2="56" y2="14" stroke="currentColor" strokeWidth="2" />
      <line x1="32" y1="22" x2="32" y2="46" stroke="currentColor" strokeWidth="2" />
      <rect x="20" y="10" width="24" height="4" fill="#0F172A" />
      {/* "FAST" stamp on the front face */}
      <text
        x="44"
        y="34"
        textAnchor="middle"
        fontSize="5"
        fontWeight="bold"
        fill="#0F172A"
        fontFamily="monospace"
      >
        FAST
      </text>
    </svg>
  );
}
