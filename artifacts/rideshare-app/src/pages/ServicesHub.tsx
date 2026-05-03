import { type ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export type ServiceId =
  | "taxi"
  | "motorcycle"
  | "microbus"
  | "vip"
  | "package";

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
    Icon: TaxiIcon,
  },
  {
    id: "motorcycle",
    title: "Motorcycle",
    blurb: "Quick, traffic-proof",
    badge: "Saves fuel",
    Icon: MotorcycleIcon,
  },
  {
    id: "microbus",
    title: "Microbus",
    blurb: "Shared servis routes",
    badge: "Cheapest",
    Icon: MicrobusIcon,
  },
  {
    id: "vip",
    title: "VIP Car",
    blurb: "Sedan, A/C, top-rated",
    badge: null,
    Icon: VipCarIcon,
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
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect?.(id)}
        aria-label={title}
        className="group relative w-full h-full text-left border-2 border-black bg-white p-3 hover:bg-yellow-400 active:translate-y-[1px] focus:outline-none focus:bg-yellow-400 transition-colors"
      >
        {badge && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#0F172A] text-yellow-400 text-[9px] font-bold uppercase tracking-widest">
            {badge}
          </span>
        )}
        <div className="aspect-square w-full flex items-center justify-center bg-gray-50 border-2 border-black group-hover:bg-white">
          <Icon />
        </div>
        <p className="mt-2 text-[12px] font-bold uppercase tracking-wider text-black">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] text-black/60 leading-snug">{blurb}</p>
      </button>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Icons — all inline SVG. No library dep, no font load, JIT-friendly.        */
/* All viewBox="0 0 64 40" or "0 0 64 48" so silhouettes read at small sizes. */
/* -------------------------------------------------------------------------- */

function TaxiIcon() {
  return (
    <svg
      viewBox="0 0 64 40"
      width="56"
      height="35"
      aria-hidden="true"
      className="text-black"
    >
      {/* Roof sign */}
      <rect x="26" y="2" width="12" height="6" fill="#0F172A" />
      <rect x="28" y="3.5" width="8" height="3" fill="#EAFF00" />
      {/* Body */}
      <path
        d="M6 26 L12 14 L52 14 L58 26 L58 32 L52 32 L52 28 L12 28 L12 32 L6 32 Z"
        fill="#EAFF00"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Windows */}
      <path
        d="M16 16 L20 22 L44 22 L48 16 Z"
        fill="white"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line x1="32" y1="16" x2="32" y2="22" stroke="currentColor" strokeWidth="1.5" />
      {/* Wheels */}
      <circle cx="18" cy="32" r="4" fill="#0F172A" stroke="currentColor" strokeWidth="2" />
      <circle cx="46" cy="32" r="4" fill="#0F172A" stroke="currentColor" strokeWidth="2" />
      {/* Checker stripe */}
      <rect x="14" y="24" width="3" height="2" fill="#0F172A" />
      <rect x="20" y="24" width="3" height="2" fill="#0F172A" />
      <rect x="26" y="24" width="3" height="2" fill="#0F172A" />
      <rect x="32" y="24" width="3" height="2" fill="#0F172A" />
      <rect x="38" y="24" width="3" height="2" fill="#0F172A" />
      <rect x="44" y="24" width="3" height="2" fill="#0F172A" />
    </svg>
  );
}

function MotorcycleIcon() {
  return (
    <svg
      viewBox="0 0 64 40"
      width="56"
      height="35"
      aria-hidden="true"
      className="text-black"
    >
      {/* Wheels */}
      <circle cx="14" cy="30" r="7" fill="white" stroke="currentColor" strokeWidth="2" />
      <circle cx="14" cy="30" r="2" fill="currentColor" />
      <circle cx="50" cy="30" r="7" fill="white" stroke="currentColor" strokeWidth="2" />
      <circle cx="50" cy="30" r="2" fill="currentColor" />
      {/* Frame */}
      <path
        d="M14 30 L26 18 L38 18 L42 14 L48 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
      <path
        d="M50 30 L42 18 L34 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
      {/* Seat */}
      <rect x="26" y="14" width="14" height="4" fill="#0F172A" />
      {/* Headlight */}
      <rect x="46" y="11" width="6" height="4" fill="#EAFF00" stroke="currentColor" strokeWidth="1.5" />
      {/* Handlebar */}
      <line x1="44" y1="9" x2="52" y2="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function MicrobusIcon() {
  return (
    <svg
      viewBox="0 0 64 40"
      width="56"
      height="35"
      aria-hidden="true"
      className="text-black"
    >
      {/* Body — boxy van shape */}
      <path
        d="M6 30 L6 12 L50 12 L58 20 L58 30 Z"
        fill="white"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Front windshield */}
      <path
        d="M50 14 L56 20 L50 20 Z"
        fill="#EAFF00"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Side windows — three passenger windows = "shared" */}
      <rect x="10" y="15" width="9" height="6" fill="#EAFF00" stroke="currentColor" strokeWidth="1.5" />
      <rect x="22" y="15" width="9" height="6" fill="#EAFF00" stroke="currentColor" strokeWidth="1.5" />
      <rect x="34" y="15" width="9" height="6" fill="#EAFF00" stroke="currentColor" strokeWidth="1.5" />
      {/* Side stripe */}
      <rect x="6" y="24" width="52" height="2" fill="#0F172A" />
      {/* Wheels */}
      <circle cx="16" cy="32" r="4" fill="#0F172A" stroke="currentColor" strokeWidth="2" />
      <circle cx="48" cy="32" r="4" fill="#0F172A" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function VipCarIcon() {
  return (
    <svg
      viewBox="0 0 64 40"
      width="56"
      height="35"
      aria-hidden="true"
      className="text-black"
    >
      {/* Body — sleek sedan */}
      <path
        d="M4 30 L10 18 L20 14 L44 14 L54 18 L60 30 L60 32 L52 32 L52 28 L12 28 L12 32 L4 32 Z"
        fill="#0F172A"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Windows — tinted */}
      <path
        d="M14 18 L22 16 L42 16 L50 18 L46 22 L18 22 Z"
        fill="#1f2937"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line x1="32" y1="16" x2="32" y2="22" stroke="currentColor" strokeWidth="1" />
      {/* Sulfur door handle accent */}
      <rect x="28" y="24" width="8" height="1.5" fill="#EAFF00" />
      {/* Wheels — chromed look via thicker outline */}
      <circle cx="16" cy="32" r="4" fill="#0F172A" stroke="#EAFF00" strokeWidth="1.5" />
      <circle cx="48" cy="32" r="4" fill="#0F172A" stroke="#EAFF00" strokeWidth="1.5" />
      {/* "VIP" tag */}
      <rect x="26" y="6" width="12" height="5" fill="#EAFF00" stroke="currentColor" strokeWidth="1" />
      <text
        x="32"
        y="10"
        textAnchor="middle"
        fontSize="4"
        fontWeight="bold"
        fill="#0F172A"
        fontFamily="monospace"
      >
        VIP
      </text>
    </svg>
  );
}

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
