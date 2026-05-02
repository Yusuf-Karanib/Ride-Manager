import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import "@/lib/MapIconFix";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  updatedAt: number;
}

interface DriverLocationPayload {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  ts?: number;
}

const DAMASCUS: [number, number] = [33.5138, 36.2765];

function channelName(rideId: string): string {
  return `ride:${rideId}:location`;
}

/* -------------------------------------------------------------------------- */
/* Driver-side helper — call this from the driver's GPS watcher               */
/* -------------------------------------------------------------------------- */

/**
 * Broadcast a driver position update for a given ride.
 *
 * Use Supabase **broadcast** channels (not postgres_changes) so we don't
 * write every GPS tick to the database. Persistence — if you want it — can
 * happen separately on a slower interval.
 */
export async function publishDriverLocation(
  rideId: string,
  coords: { lat: number; lng: number; heading?: number; speed?: number },
): Promise<void> {
  const channel = supabase.channel(channelName(rideId));
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });
  await channel.send({
    type: "broadcast",
    event: "location",
    payload: { ...coords, ts: Date.now() } satisfies DriverLocationPayload,
  });
  await supabase.removeChannel(channel);
}

/**
 * Convenience: start `navigator.geolocation.watchPosition` and broadcast every
 * fix. Returns an unsubscribe function. Driver side only.
 */
export function startBroadcastingDriverLocation(
  rideId: string,
  options: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 2000,
    timeout: 10000,
  },
): () => void {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    console.warn("[LiveTracking] geolocation not available");
    return () => {};
  }

  const channel = supabase.channel(channelName(rideId));
  let ready = false;
  channel.subscribe((status) => {
    ready = status === "SUBSCRIBED";
  });

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (!ready) return;
      void channel.send({
        type: "broadcast",
        event: "location",
        payload: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading ?? undefined,
          speed: pos.coords.speed ?? undefined,
          ts: Date.now(),
        } satisfies DriverLocationPayload,
      });
    },
    (err) => console.warn("[LiveTracking] geolocation error:", err.message),
    options,
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
    void supabase.removeChannel(channel);
  };
}

/* -------------------------------------------------------------------------- */
/* Subscriber hook — returns the latest broadcast location for a ride         */
/* -------------------------------------------------------------------------- */

export function useDriverLocationStream(rideId: string | null): {
  location: DriverLocation | null;
  connected: boolean;
} {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!rideId) {
      setLocation(null);
      setConnected(false);
      return;
    }

    let channel: RealtimeChannel | null = supabase
      .channel(channelName(rideId))
      .on("broadcast", { event: "location" }, ({ payload }) => {
        const p = payload as DriverLocationPayload;
        if (typeof p?.lat !== "number" || typeof p?.lng !== "number") return;
        setLocation({
          lat: p.lat,
          lng: p.lng,
          heading: p.heading,
          speed: p.speed,
          updatedAt: p.ts ?? Date.now(),
        });
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
      setConnected(false);
    };
  }, [rideId]);

  return { location, connected };
}

/* -------------------------------------------------------------------------- */
/* Custom car marker (no extra dep — inline SVG)                              */
/* -------------------------------------------------------------------------- */

function makeCarIcon(heading: number = 0): L.DivIcon {
  const html = `
    <div style="
      width:36px;height:36px;display:grid;place-items:center;
      background:#EAFF00;border:2px solid #000;border-radius:4px;
      box-shadow:0 0 0 4px rgba(234,255,0,0.35);
      transform:rotate(${heading}deg);transform-origin:center;
    ">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="#000" aria-hidden="true">
        <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h.5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H19v1a1 1 0 0 1-2 0v-1H7v1a1 1 0 0 1-2 0v-1h-.5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1H5zm2.6 0h8.8l-1-3a1 1 0 0 0-1-.7H9.6a1 1 0 0 0-1 .7l-1 3zM7 13.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm10 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
      </svg>
    </div>`;
  return L.divIcon({
    className: "fast24-car-marker",
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

/* -------------------------------------------------------------------------- */
/* Inner: pans the map smoothly as the driver moves                           */
/* -------------------------------------------------------------------------- */

function FollowDriver({
  location,
  follow,
}: {
  location: DriverLocation | null;
  follow: boolean;
}) {
  const map = useMap();
  const lastPanRef = useRef<number>(0);

  useEffect(() => {
    if (!location || !follow) return;
    const now = performance.now();
    // Throttle to one pan per 1.2s — Leaflet's flyTo handles in-flight smoothness.
    if (now - lastPanRef.current < 1200) return;
    lastPanRef.current = now;
    map.flyTo([location.lat, location.lng], map.getZoom(), {
      animate: true,
      duration: 1.0,
      easeLinearity: 0.25,
    });
  }, [location, follow, map]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* Public component                                                           */
/* -------------------------------------------------------------------------- */

export interface LiveTrackingProps {
  rideId: string;
  /** Optional pickup pin to anchor context. */
  pickup?: { lat: number; lng: number; label?: string };
  /** Optional dropoff pin. */
  dropoff?: { lat: number; lng: number; label?: string };
  /** Initial map center; defaults to Damascus until we get a fix. */
  fallbackCenter?: [number, number];
  initialZoom?: number;
  /** Pan the map to follow the driver. Defaults to true. */
  follow?: boolean;
  className?: string;
}

export default function LiveTracking({
  rideId,
  pickup,
  dropoff,
  fallbackCenter = DAMASCUS,
  initialZoom = 14,
  follow = true,
  className,
}: LiveTrackingProps) {
  const { location, connected } = useDriverLocationStream(rideId);

  const carIcon = useMemo(
    () => makeCarIcon(location?.heading ?? 0),
    [location?.heading],
  );

  const center: [number, number] = location
    ? [location.lat, location.lng]
    : fallbackCenter;

  const lastSeenSeconds = location
    ? Math.max(0, Math.round((Date.now() - location.updatedAt) / 1000))
    : null;

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      <MapContainer
        center={center}
        zoom={initialZoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]}>
            <Popup>{pickup.label ?? "Pickup"}</Popup>
          </Marker>
        )}

        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]}>
            <Popup>{dropoff.label ?? "Dropoff"}</Popup>
          </Marker>
        )}

        {location && (
          <Marker
            position={[location.lat, location.lng]}
            icon={carIcon}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-bold">Your driver</div>
                {typeof location.speed === "number" && (
                  <div>Speed: {Math.round(location.speed * 3.6)} km/h</div>
                )}
                <div className="text-black/60">
                  Updated {lastSeenSeconds}s ago
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        <FollowDriver location={location} follow={follow} />
      </MapContainer>

      {/* Status pill */}
      <div className="absolute top-3 left-3 z-[1100] flex items-center gap-2 px-2 py-1 border-2 border-black bg-white shadow-[2px_2px_0_0_#000]">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            connected
              ? location
                ? "bg-green-600 animate-pulse"
                : "bg-yellow-400 animate-pulse"
              : "bg-red-600"
          }`}
          aria-hidden="true"
        />
        <span className="text-[11px] font-bold uppercase tracking-widest text-black">
          {connected
            ? location
              ? `Live · ${lastSeenSeconds}s ago`
              : "Waiting for driver…"
            : "Connecting…"}
        </span>
      </div>
    </div>
  );
}
