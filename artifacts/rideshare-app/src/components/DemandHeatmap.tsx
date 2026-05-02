import { useEffect, useMemo, useState } from "react";
import { Circle } from "react-leaflet";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface DemandPoint {
  id: string;
  /** [lat, lng] — Leaflet's order, not GeoJSON's. */
  position: [number, number];
  /** 0-1 weighting. Drives color, radius, and opacity together. */
  intensity: number;
  /** Optional human label, surfaced via aria-label on the underlying element. */
  label?: string;
}

/* -------------------------------------------------------------------------- */
/* Mock data — Damascus                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Curated mock data. Replace with a Supabase aggregate query
 * (`select round(lat,3), round(lng,3), count(*) from ride_requests
 *   where created_at > now() - interval '15 min' group by 1, 2`)
 * once telemetry exists. The component shape doesn't need to change.
 *
 * Intensities are biased toward dense urban hotspots so the gradient
 * actually *looks* like a density map and not a uniform fog.
 */
export const mockDemandPoints: DemandPoint[] = [
  // Old City / Souq cluster — peak demand
  { id: "old-city-1", position: [33.5117, 36.3065], intensity: 0.95, label: "Old City" },
  { id: "old-city-2", position: [33.5141, 36.3092], intensity: 0.78 },
  { id: "old-city-3", position: [33.5099, 36.3030], intensity: 0.72 },

  // University / Baramkeh — student traffic
  { id: "uni-1", position: [33.5052, 36.2719], intensity: 0.88, label: "University" },
  { id: "uni-2", position: [33.5085, 36.2810], intensity: 0.62 },

  // Mezzeh — office cluster
  { id: "mezzeh-1", position: [33.5028, 36.2331], intensity: 0.75, label: "Mezzeh" },
  { id: "mezzeh-2", position: [33.5060, 36.2400], intensity: 0.55 },

  // Sahat al-Marjeh — central plaza
  { id: "marjeh-1", position: [33.5145, 36.3015], intensity: 0.68, label: "Marjeh" },

  // Abbasiyyin — outer ring, lower demand
  { id: "abbasiyyin-1", position: [33.5180, 36.3220], intensity: 0.42 },

  // Mazzeh 86 — residential
  { id: "mazzeh86-1", position: [33.4975, 36.2150], intensity: 0.38 },

  // Kafr Sousa — commercial
  { id: "kafrsousa-1", position: [33.4950, 36.2540], intensity: 0.58 },

  // Bab Touma — Old City eastern edge
  { id: "babtouma-1", position: [33.5160, 36.3140], intensity: 0.50 },

  // Airport road — sparse but present
  { id: "airport-1", position: [33.4500, 36.4000], intensity: 0.25 },
];

/* -------------------------------------------------------------------------- */
/* Color scale                                                                */
/* -------------------------------------------------------------------------- */

// Standard heatmap palette: cool blue → green → yellow → orange → red.
// Slightly desaturated to sit calmly on top of OSM tiles instead of
// fighting them for visual weight.
const HEAT_STOPS: Array<{ at: number; color: [number, number, number] }> = [
  { at: 0.0, color: [37, 99, 235] }, //  blue-600
  { at: 0.25, color: [16, 185, 129] }, // emerald-500
  { at: 0.5, color: [234, 179, 8] }, //  yellow-500
  { at: 0.75, color: [249, 115, 22] }, // orange-500
  { at: 1.0, color: [239, 68, 68] }, //  red-500
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function heatColor(intensity: number): string {
  const i = Math.max(0, Math.min(1, intensity));
  for (let s = 0; s < HEAT_STOPS.length - 1; s++) {
    const lo = HEAT_STOPS[s];
    const hi = HEAT_STOPS[s + 1];
    if (i <= hi.at) {
      const t = (i - lo.at) / (hi.at - lo.at);
      const r = Math.round(lerp(lo.color[0], hi.color[0], t));
      const g = Math.round(lerp(lo.color[1], hi.color[1], t));
      const b = Math.round(lerp(lo.color[2], hi.color[2], t));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  const last = HEAT_STOPS[HEAT_STOPS.length - 1].color;
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

/* -------------------------------------------------------------------------- */
/* Ring stack                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Each hotspot renders as a stack of concentric circles. The radii and
 * opacities below were tuned by eye — they produce a smooth perceptual
 * falloff without obvious banding. Tweak with care; small numeric changes
 * have surprisingly large visual impact.
 *
 * `radiusFactor` is a fraction of the point's max radius (intensity * maxRadiusMeters).
 * `opacityFactor` is a fraction of the point's peak alpha.
 */
const RING_STACK = [
  { radiusFactor: 1.0, opacityFactor: 0.10 },
  { radiusFactor: 0.75, opacityFactor: 0.20 },
  { radiusFactor: 0.55, opacityFactor: 0.32 },
  { radiusFactor: 0.35, opacityFactor: 0.48 },
  { radiusFactor: 0.18, opacityFactor: 0.65 },
];

const PEAK_ALPHA = 0.55; // Cap so even max-intensity hotspots don't fully obscure the road network.

/* -------------------------------------------------------------------------- */
/* Mock fetch hook                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Simulates a 250ms fetch. When real telemetry exists, swap the body for
 * the Supabase aggregate query and add an interval refresh.
 */
export function useDemandPoints(): {
  points: DemandPoint[];
  loading: boolean;
} {
  const [points, setPoints] = useState<DemandPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setPoints(mockDemandPoints);
      setLoading(false);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  return { points, loading };
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export interface DemandHeatmapProps {
  /** Override the data source — useful for tests or real data wiring. */
  points?: DemandPoint[];
  /**
   * Outer-ring radius (in meters) for an `intensity === 1.0` hotspot.
   * Lower values → tighter, more granular hotspots. Default 700m.
   * For city-wide views (zoom 11-12), bump to 1200-1500m.
   */
  maxRadiusMeters?: number;
  /**
   * Cap on the brightest alpha. Default 0.55. Lower values reveal more
   * of the underlying tile; higher values create stronger heat signals
   * but obscure street labels.
   */
  peakAlpha?: number;
}

/**
 * Driver-facing demand density overlay. Render as a child of <MapContainer>:
 *
 *   <MapContainer ...>
 *     <TileLayer ... />
 *     <DemandHeatmap />
 *     <Marker .../>     // driver position rendered ON TOP of the heat
 *   </MapContainer>
 *
 * Order matters: place this BEFORE markers/polylines so they paint over
 * the heat, not under it.
 */
export default function DemandHeatmap({
  points: pointsProp,
  maxRadiusMeters = 700,
  peakAlpha = PEAK_ALPHA,
}: DemandHeatmapProps) {
  const fetched = useDemandPoints();
  const points = pointsProp ?? fetched.points;

  // Pre-compute per-point render state so we don't re-derive inside the
  // ring map and pay the cost N×5 times per render.
  const rendered = useMemo(
    () =>
      points.map((p) => {
        const i = Math.max(0, Math.min(1, p.intensity));
        return {
          ...p,
          color: heatColor(i),
          baseRadius: i * maxRadiusMeters,
          baseAlpha: i * peakAlpha,
        };
      }),
    [points, maxRadiusMeters, peakAlpha],
  );

  return (
    <>
      {rendered.map((p) =>
        RING_STACK.map((ring, idx) => (
          <Circle
            key={`${p.id}-${idx}`}
            center={p.position}
            radius={p.baseRadius * ring.radiusFactor}
            // No stroke: the radial-falloff illusion only works with pure
            // fills. A border on each ring would create concentric outlines
            // that scream "stacked circles" instead of "smooth gradient."
            pathOptions={{
              stroke: false,
              fillColor: p.color,
              fillOpacity: p.baseAlpha * ring.opacityFactor,
              // Leaflet's default tooltip/aria handling on Circles is sparse;
              // an aria-label here would attach to the SVG path which screen
              // readers ignore anyway. Density data is fundamentally visual —
              // the LiveIntelOverlay markers are the accessible companion.
              interactive: false,
            }}
          />
        )),
      )}
    </>
  );
}
