import { useEffect, useState } from "react";
import { Circle, Marker, Popup } from "react-leaflet";
import L from "leaflet";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type IntelType = "demand" | "incident";
export type IntelSeverity = "low" | "medium" | "high";

export interface LiveIntel {
  id: string;
  type: IntelType;
  severity: IntelSeverity;
  /** [lat, lng] — Leaflet's order, not GeoJSON's. */
  position: [number, number];
  /** Meters. Only meaningful for demand zones; ignored for incidents. */
  radius?: number;
  title: string;
  description?: string;
  reportedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* Mock data — Damascus                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Curated mock array. Replace with a Supabase query (or paid traffic API
 * polling) when real data is available; the consumer-facing prop shape
 * doesn't need to change.
 */
export const mockLiveIntel: LiveIntel[] = [
  {
    id: "demand-old-city",
    type: "demand",
    severity: "high",
    position: [33.5117, 36.3065],
    radius: 600,
    title: "Surge — Old City",
    description: "Souq Al-Hamidiyah is busy. Expect higher offers.",
    reportedAt: new Date(),
  },
  {
    id: "demand-mezzeh",
    type: "demand",
    severity: "medium",
    position: [33.5028, 36.2331],
    radius: 800,
    title: "Surge — Mezzeh",
    description: "Office hours pickup demand.",
    reportedAt: new Date(),
  },
  {
    id: "demand-uni",
    type: "demand",
    severity: "high",
    position: [33.5052, 36.2719],
    radius: 500,
    title: "Surge — University",
    description: "Class change in 20 min.",
    reportedAt: new Date(),
  },
  {
    id: "incident-marjeh",
    type: "incident",
    severity: "high",
    position: [33.5145, 36.3015],
    title: "Road Closed — Sahat Al-Marjeh",
    description: "Police checkpoint, expect 15 min delays.",
    reportedAt: new Date(),
  },
  {
    id: "incident-airport-rd",
    type: "incident",
    severity: "medium",
    position: [33.4395, 36.4225],
    title: "Heavy Traffic — Airport Rd",
    description: "Slow-moving northbound near M5 ramp.",
    reportedAt: new Date(),
  },
  {
    id: "incident-baramkeh",
    type: "incident",
    severity: "low",
    position: [33.5096, 36.2851],
    title: "Construction — Baramkeh",
    description: "One lane closed, minor delays.",
    reportedAt: new Date(),
  },
];

/* -------------------------------------------------------------------------- */
/* Mock fetch hook                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Simulates a network fetch with a 300ms delay so the loading path gets
 * exercised. Real implementation would query Supabase or a traffic API
 * here and could subscribe to realtime updates.
 */
export function useLiveIntel(): { intel: LiveIntel[]; loading: boolean } {
  const [intel, setIntel] = useState<LiveIntel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setIntel(mockLiveIntel);
      setLoading(false);
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  return { intel, loading };
}

/* -------------------------------------------------------------------------- */
/* Color language                                                             */
/* -------------------------------------------------------------------------- */

const COLORS = {
  demand: { core: "#EAFF00", ring: "#0F172A" }, // Sulfur on midnight — surge = brand yellow
  incidentHigh: { core: "#EF4444", ring: "#0F172A" }, // Red — urgent
  incidentMedium: { core: "#F59E0B", ring: "#0F172A" }, // Amber — caution
  incidentLow: { core: "#3B82F6", ring: "#0F172A" }, // Blue — info
} as const;

function colorsFor(intel: LiveIntel): { core: string; ring: string } {
  if (intel.type === "demand") return COLORS.demand;
  if (intel.severity === "high") return COLORS.incidentHigh;
  if (intel.severity === "medium") return COLORS.incidentMedium;
  return COLORS.incidentLow;
}

/* -------------------------------------------------------------------------- */
/* Pulse keyframes — injected once at module load                             */
/* -------------------------------------------------------------------------- */

// Leaflet's divIcon HTML lives in the map pane, outside React's component
// tree, so scoped CSS-in-JS doesn't reach it. A single global <style> block
// (idempotent via id check) is the cleanest way to animate divIcon HTML.
const STYLE_ID = "live-intel-pulse-styles";
const PULSE_CSS = `
@keyframes live-intel-pulse {
  0%   { transform: scale(0.6); opacity: 0.85; }
  70%  { transform: scale(2.2); opacity: 0;    }
  100% { transform: scale(2.2); opacity: 0;    }
}
.live-intel-icon {
  position: relative;
  display: block;
  width: 14px;
  height: 14px;
}
.live-intel-icon .core {
  position: absolute; inset: 0;
  border-radius: 9999px;
  border: 2px solid var(--ring);
  background: var(--core);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
}
.live-intel-icon .pulse {
  position: absolute; inset: 0;
  border-radius: 9999px;
  background: var(--core);
  opacity: 0.8;
  animation: live-intel-pulse 1.6s ease-out infinite;
  pointer-events: none;
}
.live-intel-icon[data-severity="high"] .pulse   { animation-duration: 1.1s; }
.live-intel-icon[data-severity="medium"] .pulse { animation-duration: 1.6s; }
.live-intel-icon[data-severity="low"] .pulse    { animation-duration: 2.2s; }
`;

if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = PULSE_CSS;
  document.head.appendChild(el);
}

/* -------------------------------------------------------------------------- */
/* Icon factory                                                               */
/* -------------------------------------------------------------------------- */

function buildIcon(intel: LiveIntel): L.DivIcon {
  const { core, ring } = colorsFor(intel);
  return L.divIcon({
    className: "", // suppress Leaflet's default `.leaflet-div-icon` border
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
    html: `
      <div class="live-intel-icon" data-severity="${intel.severity}"
           style="--core:${core};--ring:${ring};">
        <div class="pulse"></div>
        <div class="core"></div>
      </div>
    `,
  });
}

/* -------------------------------------------------------------------------- */
/* Overlay                                                                    */
/* -------------------------------------------------------------------------- */

export interface LiveIntelOverlayProps {
  /** Override the intel set (e.g. from Supabase). Defaults to mock fetch. */
  intel?: LiveIntel[];
  /** Filter to a subset of types. Defaults to both. */
  types?: IntelType[];
  /** Whether to render the radius circle for demand zones. Default true. */
  showRadius?: boolean;
}

/**
 * Map overlay. Render as a child of <MapContainer>:
 *
 *     <MapContainer ...>
 *       <TileLayer ... />
 *       <LiveIntelOverlay />
 *     </MapContainer>
 */
export default function LiveIntelOverlay({
  intel: intelProp,
  types,
  showRadius = true,
}: LiveIntelOverlayProps) {
  const fetched = useLiveIntel();
  const source = intelProp ?? fetched.intel;

  const allowed = new Set(types ?? (["demand", "incident"] as IntelType[]));
  const visible = source.filter((i) => allowed.has(i.type));

  return (
    <>
      {visible.map((i) => {
        const colors = colorsFor(i);
        return (
          <IntelMarker key={i.id} intel={i} colors={colors} showRadius={showRadius} />
        );
      })}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Single-marker subcomponent                                                 */
/* -------------------------------------------------------------------------- */

function IntelMarker({
  intel,
  colors,
  showRadius,
}: {
  intel: LiveIntel;
  colors: { core: string; ring: string };
  showRadius: boolean;
}) {
  // The icon depends on the intel id + severity; rebuild only when those
  // change. Without memoization Leaflet re-renders the DOM node on every
  // parent render, which kills the CSS animation by resetting the keyframe.
  const [icon] = useState(() => buildIcon(intel));

  const isDemand = intel.type === "demand";
  const radius = intel.radius ?? 0;

  return (
    <>
      {isDemand && showRadius && radius > 0 && (
        <Circle
          center={intel.position}
          radius={radius}
          pathOptions={{
            color: colors.core,
            weight: 2,
            opacity: 0.6,
            fillColor: colors.core,
            fillOpacity: 0.08,
            dashArray: "4 4",
          }}
        />
      )}
      <Marker position={intel.position} icon={icon}>
        <Popup>
          <IntelPopup intel={intel} />
        </Popup>
      </Marker>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Popup body                                                                 */
/* -------------------------------------------------------------------------- */

function IntelPopup({ intel }: { intel: LiveIntel }) {
  const isDemand = intel.type === "demand";
  return (
    <div className="min-w-[180px]">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest border-2 border-black ${
            isDemand
              ? "bg-yellow-400 text-black"
              : intel.severity === "high"
                ? "bg-red-600 text-white"
                : intel.severity === "medium"
                  ? "bg-amber-500 text-black"
                  : "bg-blue-600 text-white"
          }`}
        >
          {isDemand ? "Demand" : intel.severity}
        </span>
        <span className="text-[10px] text-black/50 tabular-nums">
          {timeAgo(intel.reportedAt)}
        </span>
      </div>
      <p className="text-sm font-bold text-black leading-tight">
        {intel.title}
      </p>
      {intel.description && (
        <p className="text-[11px] text-black/70 mt-1 leading-snug">
          {intel.description}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function timeAgo(d: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
