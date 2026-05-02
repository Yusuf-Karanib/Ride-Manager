import L from "leaflet";
import { useMemo } from "react";
import { Marker, Polyline, useMap } from "react-leaflet";
import type { Landmark } from "@/data/landmarks";

/* -------------------------------------------------------------------------- */
/* Types & helpers                                                            */
/* -------------------------------------------------------------------------- */

export type WaypointRole = "pickup" | "stop" | "dropoff";

export interface Waypoint {
  id: string;
  role: WaypointRole;
  label: string;
  lat?: number;
  lng?: number;
}

export const MAX_INTERMEDIATE_STOPS = 4;

function makeId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `wp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Initial waypoints array — empty pickup + empty dropoff. */
export function createInitialWaypoints(
  pickup = "",
  dropoff = "",
): Waypoint[] {
  return [
    { id: makeId(), role: "pickup", label: pickup },
    { id: makeId(), role: "dropoff", label: dropoff },
  ];
}

/** True if the route can be submitted (pickup + dropoff filled). */
export function isRouteValid(waypoints: Waypoint[]): boolean {
  if (waypoints.length < 2) return false;
  return waypoints.every((w) => w.label.trim().length > 0);
}

/** Convert a landmark from the dataset into a waypoint patch. */
export function waypointFromLandmark(
  landmark: Landmark,
): Pick<Waypoint, "label" | "lat" | "lng"> {
  return { label: landmark.name, lat: landmark.lat, lng: landmark.lng };
}

/* -------------------------------------------------------------------------- */
/* Manager component (the form)                                               */
/* -------------------------------------------------------------------------- */

export interface MultiStopManagerProps {
  value: Waypoint[];
  onChange: (next: Waypoint[]) => void;
  /** Max intermediate stops (excludes pickup + dropoff). Default 4. */
  maxStops?: number;
  className?: string;
}

export default function MultiStopManager({
  value,
  onChange,
  maxStops = MAX_INTERMEDIATE_STOPS,
  className,
}: MultiStopManagerProps) {
  const stopCount = value.filter((w) => w.role === "stop").length;
  const canAddStop = stopCount < maxStops;

  const setLabel = (id: string, label: string) => {
    onChange(
      value.map((w) =>
        w.id === id ? { ...w, label, lat: undefined, lng: undefined } : w,
      ),
    );
  };

  const addStop = () => {
    if (!canAddStop) return;
    const dropoffIdx = value.findIndex((w) => w.role === "dropoff");
    const insertAt = dropoffIdx === -1 ? value.length : dropoffIdx;
    const next = [...value];
    next.splice(insertAt, 0, { id: makeId(), role: "stop", label: "" });
    onChange(next);
  };

  const removeStop = (id: string) => {
    onChange(value.filter((w) => !(w.role === "stop" && w.id === id)));
  };

  const moveStop = (id: string, direction: -1 | 1) => {
    const idx = value.findIndex((w) => w.id === id);
    if (idx === -1) return;
    const target = idx + direction;
    if (target <= 0 || target >= value.length - 1) return; // can't displace pickup/dropoff
    if (value[target].role !== "stop") return;
    const next = [...value];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <section
      className={`space-y-2 ${className ?? ""}`}
      aria-label="Trip waypoints"
    >
      <ul className="space-y-2">
        {value.map((wp, i) => (
          <WaypointRow
            key={wp.id}
            waypoint={wp}
            index={indexFor(value, i)}
            isFirst={i === 0}
            isLast={i === value.length - 1}
            canMoveUp={
              wp.role === "stop" && i > 1 && value[i - 1].role === "stop"
            }
            canMoveDown={
              wp.role === "stop" &&
              i < value.length - 2 &&
              value[i + 1].role === "stop"
            }
            onLabelChange={(label) => setLabel(wp.id, label)}
            onRemove={() => removeStop(wp.id)}
            onMoveUp={() => moveStop(wp.id, -1)}
            onMoveDown={() => moveStop(wp.id, 1)}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={addStop}
        disabled={!canAddStop}
        className="w-full px-3 py-2 border-2 border-dashed border-black bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {canAddStop
          ? "+ Add Stop"
          : `Max ${maxStops} stop${maxStops === 1 ? "" : "s"}`}
      </button>
    </section>
  );
}

/** Numbered label for the marker pill: P, 1, 2, ..., D. */
function indexFor(all: Waypoint[], i: number): string {
  if (all[i].role === "pickup") return "P";
  if (all[i].role === "dropoff") return "D";
  // Count how many stops precede this one (inclusive of self).
  let n = 0;
  for (let k = 0; k <= i; k++) if (all[k].role === "stop") n++;
  return String(n);
}

interface WaypointRowProps {
  waypoint: Waypoint;
  index: string;
  isFirst: boolean;
  isLast: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onLabelChange: (label: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function WaypointRow({
  waypoint,
  index,
  isFirst,
  isLast,
  canMoveUp,
  canMoveDown,
  onLabelChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: WaypointRowProps) {
  const placeholder = isFirst ? "Pickup" : isLast ? "Dropoff" : "Stop";
  const badgeBg = isFirst
    ? "bg-green-600 text-white"
    : isLast
      ? "bg-red-600 text-white"
      : "bg-yellow-400 text-black";

  return (
    <li className="flex items-center gap-2">
      <span
        className={`shrink-0 inline-flex items-center justify-center w-7 h-7 border-2 border-black text-xs font-bold ${badgeBg}`}
        aria-hidden="true"
      >
        {index}
      </span>

      <input
        type="text"
        value={waypoint.label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 min-w-0 px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none focus:bg-yellow-50"
      />

      {waypoint.role === "stop" && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Move stop up"
            className="w-7 h-7 border-2 border-black bg-white text-black text-xs font-bold hover:bg-yellow-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Move stop down"
            className="w-7 h-7 border-2 border-black bg-white text-black text-xs font-bold hover:bg-yellow-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove stop"
            className="w-7 h-7 border-2 border-black bg-black text-white text-xs font-bold hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Map overlay — drop inside an existing <MapContainer>                       */
/* -------------------------------------------------------------------------- */

function makeBadgeIcon(label: string, color: "green" | "yellow" | "red"): L.DivIcon {
  const bg =
    color === "green" ? "#16A34A" : color === "red" ? "#DC2626" : "#EAFF00";
  const fg = color === "yellow" ? "#000" : "#fff";
  const html = `
    <div style="
      width:28px;height:28px;display:grid;place-items:center;
      background:${bg};color:${fg};border:2px solid #000;
      font:700 12px/1 system-ui,sans-serif;
      box-shadow:2px 2px 0 0 #000;">${label}</div>`;
  return L.divIcon({
    className: "fast24-waypoint-marker",
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export interface RoutePolylineProps {
  waypoints: Waypoint[];
  /** Auto-fit map bounds to the route on change. Default true. */
  fitBounds?: boolean;
}

/**
 * Renders numbered markers + a multi-segment polyline for any waypoints
 * that have coords. Place inside a `<MapContainer>` (NOT outside).
 */
export function RoutePolyline({
  waypoints,
  fitBounds = true,
}: RoutePolylineProps) {
  const map = useMap();

  const points = useMemo(
    () =>
      waypoints
        .filter(
          (w): w is Waypoint & { lat: number; lng: number } =>
            typeof w.lat === "number" && typeof w.lng === "number",
        )
        .map((w) => ({ ...w, latlng: [w.lat, w.lng] as [number, number] })),
    [waypoints],
  );

  // Fit to route whenever the geocoded points change.
  // Note: depends on the stable `points` array identity, not raw waypoints.
  useMemo(() => {
    if (!fitBounds || points.length < 2) return;
    const bounds = L.latLngBounds(points.map((p) => p.latlng));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [points, fitBounds, map]);

  if (points.length === 0) return null;

  const path = points.map((p) => p.latlng);

  return (
    <>
      {points.length >= 2 && (
        <>
          {/* Brutalist two-pass polyline: black underline + yellow overlay. */}
          <Polyline
            positions={path}
            pathOptions={{ color: "#000", weight: 8, opacity: 1 }}
          />
          <Polyline
            positions={path}
            pathOptions={{ color: "#EAFF00", weight: 4, opacity: 1 }}
          />
        </>
      )}

      {points.map((p, i) => {
        const isFirst = p.role === "pickup";
        const isLast = p.role === "dropoff";
        const color: "green" | "yellow" | "red" = isFirst
          ? "green"
          : isLast
            ? "red"
            : "yellow";
        const label = isFirst
          ? "P"
          : isLast
            ? "D"
            : String(
                points
                  .slice(0, i + 1)
                  .filter((q) => q.role === "stop").length,
              );
        return (
          <Marker
            key={p.id}
            position={p.latlng}
            icon={makeBadgeIcon(label, color)}
          />
        );
      })}
    </>
  );
}
