import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import RiderNegotiation from "@/components/RiderNegotiation";

const DefaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface RiderScreenProps {
  onRequestRide: (agreedPriceSyp: number) => void;
  onSignOut: () => void;
}

const DAMASCUS: [number, number] = [33.5138, 36.2765];

const MOCK_OFFERS = [
  { id: "o1", driverName: "Ahmad K.", priceSyp: 28000 },
  { id: "o2", driverName: "Layla M.", priceSyp: 32000 },
  { id: "o3", driverName: "Omar S.", priceSyp: 25000 },
  { id: "o4", driverName: "Nour H.", priceSyp: 35000 },
];

export default function RiderScreen({ onRequestRide, onSignOut }: RiderScreenProps) {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [price, setPrice] = useState<string>("");
  const [negotiationOpen, setNegotiationOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNegotiationOpen(true);
  };

  const handleAcceptOffer = (offer: { id: string; driverName: string; priceSyp: number }) => {
    setNegotiationOpen(false);
    onRequestRide(offer.priceSyp);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <div className="h-1/2 w-full relative">
        <div className="absolute top-3 right-3 z-[1000]">
          <button
            onClick={onSignOut}
            className="px-3 py-1.5 bg-white text-sm font-medium text-gray-900 border border-gray-300 shadow"
          >
            Sign out
          </button>
        </div>
        <MapContainer
          center={DAMASCUS}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={DAMASCUS}>
            <Popup>Damascus city center</Popup>
          </Marker>
        </MapContainer>
      </div>

      <div className="h-1/2 w-full bg-yellow-400 px-6 py-5 flex flex-col">
        <h2 className="text-lg font-bold text-black mb-4">Request a Ride</h2>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="space-y-3 flex-1">
            <div>
              <label
                htmlFor="pickup"
                className="block text-xs font-bold text-black uppercase mb-1"
              >
                Pickup Landmark
              </label>
              <input
                id="pickup"
                type="text"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                placeholder="e.g. Umayyad Square"
                className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="dropoff"
                className="block text-xs font-bold text-black uppercase mb-1"
              >
                Dropoff Landmark
              </label>
              <input
                id="dropoff"
                type="text"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
                placeholder="e.g. Old City Gate"
                className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="price"
                className="block text-xs font-bold text-black uppercase mb-1"
              >
                Offer Price (SYP)
              </label>
              <input
                id="price"
                type="number"
                min={0}
                step={1000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 w-full py-4 bg-black text-white text-base font-bold uppercase tracking-wider border-2 border-black hover:bg-gray-900"
          >
            Request Ride
          </button>
        </form>
      </div>

      <RiderNegotiation
        open={negotiationOpen}
        offers={MOCK_OFFERS}
        onAccept={handleAcceptOffer}
        onClose={() => setNegotiationOpen(false)}
      />
    </div>
  );
}
