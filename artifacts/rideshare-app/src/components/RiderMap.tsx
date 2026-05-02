import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "@/lib/MapIconFix";

const DAMASCUS: [number, number] = [33.5138, 36.2765];

interface RiderMapProps {
  center?: [number, number];
  zoom?: number;
}

export default function RiderMap({
  center = DAMASCUS,
  zoom = 13,
}: RiderMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={center}>
        <Popup>Damascus city center</Popup>
      </Marker>
    </MapContainer>
  );
}
