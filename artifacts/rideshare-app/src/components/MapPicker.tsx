import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "@/lib/MapIconFix";

export interface LatLng {
  lat: number;
  lng: number;
}

interface MapPickerProps {
  mode: "pickup" | "dropoff";
  /** Starting center. Defaults to Damascus city center. */
  initialCenter?: LatLng;
  initialZoom?: number;
  /**
   * Fired when the user confirms a location. The picker has already
   * attempted reverse-geocoding; on failure, `landmark` falls back to a
   * formatted "lat, lng" string so the form remains usable.
   */
  onConfirm: (landmark: string, coords: LatLng) => void;
  /** Optional dismiss handler — parent owns presentation, parent owns dismissal. */
  onCancel?: () => void;
  className?: string;
}

const DAMASCUS: LatLng = { lat: 33.5138, lng: 36.2765 };
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

/* -------------------------------------------------------------------------- */
/* Map-internal helpers                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Tracks the map's center and reports it to the parent on `moveend` (the
 * post-drag, post-flyTo event). We deliberately do NOT bind to `move` —
 * that fires on every animation frame and would thrash React state.
 */
function CenterTracker({ onChange }: { onChange: (c: LatLng) => void }) {
  const map = useMap();

  // Seed once on mount so the coords readout reflects the initial center
  // before the user has interacted.
  useEffect(() => {
    const c = map.getCenter();
    onChange({ lat: c.lat, lng: c.lng });
  }, [map, onChange]);

  useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onChange({ lat: c.lat, lng: c.lng });
    },
  });

  return null;
}

function LocateButton() {
  const map = useMap();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleClick = () => {
    setErr(null);
    if (!("geolocation" in navigator)) {
      setErr("Geolocation not supported on this device.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // flyTo triggers moveend, which CenterTracker already listens to,
        // so we don't need to thread the coords back manually.
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 16);
        setBusy(false);
      },
      (e) => {
        setErr(e.message || "Location unavailable.");
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="absolute top-3 right-3 z-[1000] px-3 py-2 bg-black text-[#EAFF00] text-xs font-bold uppercase tracking-wider border-2 border-black hover:bg-[#0F172A] disabled:bg-gray-400 disabled:border-gray-400"
      >
        {busy ? "Locating…" : "Use My Location"}
      </button>
      {err && (
        <div
          role="alert"
          className="absolute top-14 right-3 z-[1000] bg-red-600 text-white text-xs font-bold px-2 py-1 border-2 border-black max-w-[60%]"
        >
          {err}
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Reverse geocoding                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Hits Nominatim (OSM's free reverse-geocoder). No API key required.
 * Subject to a 1 req/sec public-policy rate limit; for production volume
 * swap this for a self-hosted Nominatim or a paid provider.
 */
async function reverseGeocode(
  coords: LatLng,
  signal: AbortSignal,
): Promise<string> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(coords.lat),
    lon: String(coords.lng),
    zoom: "16",
    addressdetails: "1",
  });
  const res = await fetch(`${NOMINATIM_REVERSE}?${params.toString()}`, {
    signal,
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error(`Reverse geocode failed (${res.status}).`);
  const data = (await res.json()) as {
    name?: string;
    display_name?: string;
    address?: Record<string, string>;
  };
  const a = data.address ?? {};
  // Prefer specific landmarks → streets → neighbourhoods → city. Display
  // name's first segment is the last-resort fallback before coords.
  const landmark =
    data.name ||
    a.road ||
    a.pedestrian ||
    a.neighbourhood ||
    a.suburb ||
    a.quarter ||
    a.city_district ||
    a.city ||
    a.town ||
    a.village ||
    (data.display_name ? data.display_name.split(",")[0].trim() : "");
  if (!landmark) throw new Error("No landmark found at this location.");
  return landmark;
}

function formatCoords(c: LatLng): string {
  return `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function MapPicker({
  mode,
  initialCenter = DAMASCUS,
  initialZoom = 14,
  onConfirm,
  onCancel,
  className,
}: MapPickerProps) {
  const [center, setCenter] = useState<LatLng>(initialCenter);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stable callback so CenterTracker's effect doesn't bounce on each render.
  const handleCenter = useCallback((c: LatLng) => setCenter(c), []);

  // Abort any in-flight reverse-geocode on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleConfirm = async () => {
    setError(null);
    setConfirming(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const landmark = await reverseGeocode(center, ctrl.signal);
      onConfirm(landmark, center);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      // Honest fallback: hand back the coordinate string so the form is
      // still usable when Nominatim is rate-limiting or offline. Surface
      // the failure visibly rather than silently swallowing it.
      const fallback = formatCoords(center);
      setError(
        e instanceof Error
          ? e.message
          : "Could not look up landmark — using coords.",
      );
      onConfirm(fallback, center);
    } finally {
      if (!ctrl.signal.aborted) setConfirming(false);
    }
  };

  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      {/* Mode + live coords readout */}
      <div className="absolute top-3 left-3 z-[1000] bg-white border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-black flex flex-col gap-0.5">
        <span>Drag map to set {mode}</span>
        <span className="font-mono text-[10px] tabular-nums text-black/70 normal-case">
          {formatCoords(center)}
        </span>
      </div>

      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={initialZoom}
        className="w-full h-full"
        style={{ minHeight: 280 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CenterTracker onChange={handleCenter} />
        <LocateButton />
      </MapContainer>

      {/* Fixed crosshair pin — anchored bottom-center to the map geometric center */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 z-[1000]"
        style={{ transform: "translate(-50%, -100%)" }}
        data-testid="map-picker-crosshair"
      >
        <SulfurPin />
      </div>

      {/* Bottom action bar */}
      <div className="absolute left-0 right-0 bottom-0 z-[1000] bg-white border-t-2 border-black p-3 flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 bg-white text-black text-xs font-bold uppercase tracking-wider border-2 border-black hover:bg-black hover:text-[#EAFF00] active:translate-y-[1px]"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirming}
          className="flex-1 px-4 py-3 bg-black text-[#EAFF00] text-sm font-bold uppercase tracking-[0.2em] border-2 border-black hover:bg-[#0F172A] active:translate-y-[1px] disabled:bg-black/40 disabled:text-[#EAFF00]/50 disabled:cursor-not-allowed"
          data-testid="confirm-location"
        >
          {confirming ? "Looking up…" : "Confirm Location"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="absolute bottom-20 left-3 right-3 z-[1000] bg-red-600 text-white text-xs font-bold px-3 py-2 border-2 border-black"
        >
          {error}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sulfur pin — sharp brutalist teardrop, bottom tip = map center               */
/* -------------------------------------------------------------------------- */

function SulfurPin() {
  return (
    <svg
      width="28"
      height="40"
      viewBox="0 0 28 40"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: "block",
        filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.6))",
      }}
    >
      <path
        d="M14 0 L28 16 L14 40 L0 16 Z"
        fill="#EAFF00"
        stroke="#000"
        strokeWidth="2.5"
        strokeLinejoin="miter"
      />
      <circle cx="14" cy="14" r="4" fill="#000" />
    </svg>
  );
}
