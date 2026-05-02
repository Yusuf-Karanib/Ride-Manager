import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "@/lib/MapIconFix";

export interface LatLng {
  lat: number;
  lng: number;
}

interface MapPickerProps {
  mode: "pickup" | "dropoff";
  value: LatLng | null;
  onChange: (coords: LatLng) => void;
  initialCenter?: LatLng;
  initialZoom?: number;
  className?: string;
}

const DEFAULT_CENTER: LatLng = { lat: 33.5138, lng: 36.2765 };

function ClickHandler({
  onPick,
}: {
  onPick: (coords: LatLng) => void;
}) {
  useMapEvents({
    click: (event) => {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function LocateButton({
  onLocated,
  setError,
  setLocating,
  locating,
}: {
  onLocated: (coords: LatLng) => void;
  setError: (msg: string | null) => void;
  setLocating: (busy: boolean) => void;
  locating: boolean;
}) {
  const map = useMap();

  const handleClick = () => {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.flyTo([coords.lat, coords.lng], 15);
        onLocated(coords);
        setLocating(false);
      },
      (err) => {
        setError(err.message || "Could not get your location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={locating}
      className="absolute top-3 right-3 z-[1000] px-3 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider border-2 border-black hover:bg-gray-900 disabled:bg-gray-400 disabled:border-gray-400"
    >
      {locating ? "Locating…" : "Use My Location"}
    </button>
  );
}

export default function MapPicker({
  mode,
  value,
  onChange,
  initialCenter = DEFAULT_CENTER,
  initialZoom = 13,
  className,
}: MapPickerProps) {
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const center: [number, number] = value
    ? [value.lat, value.lng]
    : [initialCenter.lat, initialCenter.lng];

  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      <div className="absolute top-3 left-3 z-[1000] bg-white border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-black">
        Tap map to set {mode}
      </div>

      <MapContainer
        center={center}
        zoom={initialZoom}
        className="w-full h-full"
        style={{ minHeight: 240 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onChange} />
        {value && <Marker position={[value.lat, value.lng]} />}
        <LocateButton
          onLocated={onChange}
          setError={setError}
          setLocating={setLocating}
          locating={locating}
        />
      </MapContainer>

      {error && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-red-600 text-white text-xs font-bold px-3 py-2 border-2 border-black">
          {error}
        </div>
      )}
    </div>
  );
}
