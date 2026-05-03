import { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Marker, Tooltip, useMap } from "react-leaflet";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export type IntelSeverity = "high" | "medium" | "low";
export type IntelKind =
  | "demand_spike"
  | "traffic_jam"
  | "road_closure"
  | "weather"
  | "event"
  | "police_check";

export interface IntelZone {
  id: string;
  lat: number;
  lng: number;
  kind: IntelKind;
  severity: IntelSeverity;
  /** Short headline shown in the tooltip. */
  title: string;
  /** Optional secondary line (cause, ETA, multiplier, etc.). */
  detail?: string;
  /** ISO timestamp; used to compute "X min ago" in the tooltip. */
  reportedAt?: string;
}

export interface LiveIntelOverlayHandle {
  /** Re-fetches the mock data immediately. */
  refresh: () => Promise<void>;
}

export interface LiveIntelOverlayProps {
  /** Override the mock fetcher with a real source when wiring backend. */
  fetcher?: (signal: AbortSignal) => Promise<IntelZone[]>;
  /** Hard cap rendered zones to protect mobile FPS. Default 12. */
  maxZones?: number;
  /** Auto-refresh interval (ms). Default 60_000. Set 0 to disable. */
  refreshIntervalMs?: number;
  /** Imperative handle for parent-driven refresh. */
  ref?: React.Ref<LiveIntelOverlayHandle>;
}

/* -------------------------------------------------------------------------- */
/* Severity → color (literal class strings so Tailwind's scanner picks them up) */
/* -------------------------------------------------------------------------- */
//
// CRITICAL: do not refactor these into dynamic strings like `bg-${color}-600`.
// Tailwind v4's content scanner only generates classes that appear literally
// in source. Dynamic interpolation produces purged-away classes at runtime.

const SEVERITY_STYLES: Record<
  IntelSeverity,
  { dot: string; ring: string; border: string; ringHex: string }
> = {
  high: {
    dot: "bg-red-600",
    ring: "bg-red-500",
    border: "border-red-700",
    ringHex: "#dc2626",
  },
  medium: {
    dot: "bg-yellow-400",
    ring: "bg-yellow-300",
    border: "border-yellow-600",
    ringHex: "#facc15",
  },
  low: {
    dot: "bg-blue-500",
    ring: "bg-blue-400",
    border: "border-blue-700",
    ringHex: "#3b82f6",
  },
};

const KIND_LABELS: Record<IntelKind, string> = {
  demand_spike: "Demand Spike",
  traffic_jam: "Traffic Jam",
  road_closure: "Road Closure",
  weather: "Weather",
  event: "Event",
  police_check: "Checkpoint",
};

/* -------------------------------------------------------------------------- */
/* Mock fetcher                                                               */
/* -------------------------------------------------------------------------- */

const MOCK_ZONES: IntelZone[] = [
  {
    id: "zi_1",
    lat: 33.5138,
    lng: 36.2765,
    kind: "demand_spike",
    severity: "high",
    title: "High demand · Old City",
    detail: "Surge x1.6 expected next 20 min",
    reportedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
  },
  {
    id: "zi_2",
    lat: 33.5197,
    lng: 36.2599,
    kind: "traffic_jam",
    severity: "medium",
    title: "Traffic on Mezzeh Highway",
    detail: "Slow eastbound, ~12 min delay",
    reportedAt: new Date(Date.now() - 11 * 60_000).toISOString(),
  },
  {
    id: "zi_3",
    lat: 33.5024,
    lng: 36.2901,
    kind: "road_closure",
    severity: "high",
    title: "Road closed · Bab Touma area",
    detail: "Avoid east approach",
    reportedAt: new Date(Date.now() - 28 * 60_000).toISOString(),
  },
  {
    id: "zi_4",
    lat: 33.5093,
    lng: 36.3036,
    kind: "demand_spike",
    severity: "medium",
    title: "Rising demand · Jaramana",
    detail: "Peak commute window",
    reportedAt: new Date(Date.now() - 7 * 60_000).toISOString(),
  },
  {
    id: "zi_5",
    lat: 33.5301,
    lng: 36.2898,
    kind: "event",
    severity: "low",
    title: "Event letting out · Tishreen Park",
    detail: "Light pickup wave expected",
    reportedAt: new Date(Date.now() - 18 * 60_000).toISOString(),
  },
  {
    id: "zi_6",
    lat: 33.4942,
    lng: 36.2547,
    kind: "police_check",
    severity: "low",
    title: "Checkpoint · Mezzeh entrance",
    detail: "Moving smoothly",
    reportedAt: new Date(Date.now() - 35 * 60_000).toISOString(),
  },
  {
    id: "zi_7",
    lat: 33.5267,
    lng: 36.2412,
    kind: "weather",
    severity: "medium",
    title: "Light rain · West Damascus",
    detail: "Slick roads, drive cautious",
    reportedAt: new Date(Date.now() - 22 * 60_000).toISOString(),
  },
  {
    id: "zi_8",
    lat: 33.5172,
    lng: 36.3180,
    kind: "traffic_jam",
    severity: "high",
    title: "Heavy backup · Airport Road",
    detail: "20+ min delay",
    reportedAt: new Date(Date.now() - 6 * 60_000).toISOString(),
  },
];

async function defaultMockFetcher(
  signal: AbortSignal,
): Promise<IntelZone[]> {
  // Simulate network latency. AbortSignal-aware so unmount cancels cleanly.
  await new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(resolve, 400);
    signal.addEventListener("abort", () => {
      window.clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
  // Lightly randomize so successive refreshes feel "live" without changing
  // the underlying zone identities.
  return MOCK_ZONES.map((z) => ({
    ...z,
    reportedAt: z.reportedAt ?? new Date().toISOString(),
  }));
}

/* -------------------------------------------------------------------------- */
/* DivIcon factory — pulsing pin                                              */
/* -------------------------------------------------------------------------- */
//
// We build the icon HTML by hand (rather than rendering React into a portal)
// because Leaflet expects a stable DOM string for each marker. The animation
// is pure CSS via Tailwind's `animate-ping` utility, which Tailwind generates
// as long as it appears literally somewhere in source — done below.

const SR_ANIMATE_PING_HINT = "animate-ping"; // keep literal so JIT picks it up

function buildPulsingIcon(severity: IntelSeverity): L.DivIcon {
  const s = SEVERITY_STYLES[severity];
  // A 14×14 dot with an absolute-positioned ring overlay that uses
  // animate-ping (scale 1→2, opacity 0.75→0). The ring is sized to match
  // the dot at scale=1 so the visual origin stays centered on the lat/lng.
  const html = `
    <div class="relative" style="width:14px;height:14px;">
      <span
        aria-hidden="true"
        class="absolute inset-0 rounded-full ${s.ring} opacity-60 animate-ping"
      ></span>
      <span
        aria-hidden="true"
        class="absolute inset-0 rounded-full ${s.dot} border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
      ></span>
    </div>
  `;
  return L.divIcon({
    html,
    // Empty string disables Leaflet's default `.leaflet-div-icon` styles
    // (which would add a white box around our markup).
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7], // center the dot on the lat/lng coordinate
    // Tooltip will anchor relative to this point.
    tooltipAnchor: [0, -8],
  });
}

/* -------------------------------------------------------------------------- */
/* Time helper                                                                */
/* -------------------------------------------------------------------------- */

function relMinutes(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (diff < 1) return "just now";
  if (diff === 1) return "1 min ago";
  if (diff < 60) return `${diff} min ago`;
  return `${Math.round(diff / 60)} hr ago`;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Live Intel — pulsing zone markers for high-demand areas, traffic, and
 * road conditions.
 *
 * MUST be rendered as a child of `<MapContainer>`:
 *
 *   <MapContainer center={...} zoom={13}>
 *     <TileLayer ... />
 *     <LiveIntelOverlay />
 *     <Marker position={driverPos} />   // renders ON TOP of intel
 *   </MapContainer>
 *
 * Pane note: react-leaflet places markers in the default `markerPane`
 * (z-index 600), above tiles (200) and below tooltips (650). Driver/rider
 * position markers render above intel only by source order — list this
 * component before user markers if you want intel to sit underneath.
 */
export default function LiveIntelOverlay({
  fetcher = defaultMockFetcher,
  maxZones = 12,
  refreshIntervalMs = 60_000,
  ref,
}: LiveIntelOverlayProps) {
  // Touching `useMap()` ensures we crash loud and early if someone forgets
  // to wrap us in a MapContainer (instead of failing silently with no
  // markers).
  useMap();

  const [zones, setZones] = useState<IntelZone[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const load = useMemo(
    () => async () => {
      // Cancel any in-flight fetch before starting a new one.
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const next = await fetcher(ctrl.signal);
        if (ctrl.signal.aborted) return;
        setZones(next.slice(0, maxZones));
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return; // expected on unmount / refresh races
        }
        // Don't surface error UI — intel is supplemental. Log and keep the
        // previous zones visible so the map doesn't go dark on a transient
        // network blip.
        console.warn("[LiveIntel] fetch failed:", err);
      }
    },
    [fetcher, maxZones],
  );

  // Initial fetch + interval polling.
  useEffect(() => {
    void load();
    if (refreshIntervalMs <= 0) return;
    const id = window.setInterval(() => void load(), refreshIntervalMs);
    return () => {
      window.clearInterval(id);
      abortRef.current?.abort();
    };
  }, [load, refreshIntervalMs]);

  // Imperative refresh handle for parent-driven pull-to-refresh.
  useImperativeHandle(ref, () => ({ refresh: load }), [load]);

  // Build icons once per severity, not per marker — `L.divIcon` is cheap
  // but identical instances let Leaflet skip recreating DOM on rerenders.
  const iconCache = useMemo(
    () => ({
      high: buildPulsingIcon("high"),
      medium: buildPulsingIcon("medium"),
      low: buildPulsingIcon("low"),
    }),
    [],
  );

  return (
    <>
      {zones.map((z) => {
        const styles = SEVERITY_STYLES[z.severity];
        const kindLabel = KIND_LABELS[z.kind] ?? z.kind;
        return (
          <Marker
            key={z.id}
            position={[z.lat, z.lng]}
            icon={iconCache[z.severity]}
            // Keep markers non-clickable on the map itself; tooltip handles
            // hover/tap. Clicks would conflict with map drag on mobile.
            interactive={true}
            keyboard={false}
          >
            <Tooltip
              direction="top"
              offset={[0, -4]}
              opacity={1}
              // sticky=false → tooltip closes on mouseout / outside tap.
              sticky={false}
            >
              <div
                className={`min-w-[160px] max-w-[220px] bg-[#0F172A] text-white border-2 ${styles.border} px-2 py-1.5`}
                style={{
                  // Inline a hint of the severity color in the corner for
                  // glanceable severity reading even if the user color-blind
                  // can't distinguish the dot.
                  borderLeftWidth: 6,
                  borderLeftColor: styles.ringHex,
                }}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest text-yellow-400">
                  Live intel · {kindLabel}
                </p>
                <p className="mt-0.5 text-[12px] font-bold leading-tight">
                  {z.title}
                </p>
                {z.detail && (
                  <p className="mt-0.5 text-[10px] text-white/80 leading-snug">
                    {z.detail}
                  </p>
                )}
                {z.reportedAt && (
                  <p className="mt-1 text-[9px] text-white/50 uppercase tracking-widest">
                    {relMinutes(z.reportedAt)}
                  </p>
                )}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
      {/* Tailwind JIT hint — keeps animate-ping in the bundle even if no
          other source mentions it. Hidden, zero layout cost. */}
      <span hidden aria-hidden="true" className={SR_ANIMATE_PING_HINT} />
    </>
  );
}
