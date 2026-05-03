import { useState } from "react";
import { useLocation } from "wouter";
import { LazyRiderMap } from "@/components/LazyMap";
import RiderNegotiation from "@/components/RiderNegotiation";
import { useUser } from "@/context/UserContext";
import type { ServiceId } from "@/pages/ServicesHub";

interface RiderScreenProps {
  /**
   * Fired when the rider locks in an agreed price (either by direct submit
   * or by accepting a negotiation offer). `serviceType` is the UI-level
   * ServiceId; persistence-layer callers should run it through
   * `serviceIdToServiceType()` before writing to `rides.service_type`.
   */
  onRequestRide: (agreedPriceSyp: number, serviceType: ServiceId) => void;
  onSignOut: () => void;
}

const DAMASCUS: [number, number] = [33.5138, 36.2765];

const MOCK_OFFERS = [
  { id: "o1", driverName: "Ahmad K.", priceSyp: 28000 },
  { id: "o2", driverName: "Layla M.", priceSyp: 32000 },
  { id: "o3", driverName: "Omar S.", priceSyp: 25000 },
  { id: "o4", driverName: "Nour H.", priceSyp: 35000 },
];

// Chips deliberately omit "vip" — VIP is a tier modifier, not a base
// service category. Keep the four tap-targets matching the rider's
// real choice set.
const SERVICE_CHIPS: { id: ServiceId; label: string }[] = [
  { id: "taxi", label: "Taxi" },
  { id: "motorcycle", label: "Motorcycle" },
  { id: "microbus", label: "Microbus" },
  { id: "package", label: "Package" },
];

export default function RiderScreen({ onRequestRide, onSignOut }: RiderScreenProps) {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [price, setPrice] = useState<string>("");
  const [serviceType, setServiceType] = useState<ServiceId>("taxi");
  // Map hidden by default — keeps the Leaflet/RiderMap dynamic chunk
  // un-fetched until the rider explicitly opts in.
  const [showMap, setShowMap] = useState(false);
  const [negotiationOpen, setNegotiationOpen] = useState(false);
  const { userType } = useUser();
  const [, setLocation] = useLocation();

  const isAuthenticated = userType !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setLocation("/auth");
      return;
    }
    setNegotiationOpen(true);
  };

  const handleAcceptOffer = (offer: { id: string; driverName: string; priceSyp: number }) => {
    setNegotiationOpen(false);
    onRequestRide(offer.priceSyp, serviceType);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {showMap && (
        <div className="h-1/2 w-full relative">
          <LazyRiderMap center={DAMASCUS} zoom={13} />
        </div>
      )}

      <div
        className={`${showMap ? "h-1/2" : "h-full"} w-full bg-yellow-400 px-6 py-5 flex flex-col overflow-y-auto`}
      >
        {/* Header row — title left, map toggle + sign in/out right.
            Sign-in/out used to live as an overlay on the map; with the
            map now optional, it needs a permanent home. */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-black">Request a Ride</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              className="px-3 py-1.5 bg-white text-xs font-bold uppercase tracking-wider text-black border-2 border-black"
            >
              {showMap ? "Hide Map" : "Select on Map"}
            </button>
            <button
              type="button"
              onClick={isAuthenticated ? onSignOut : () => setLocation("/auth")}
              className="px-3 py-1.5 bg-white text-xs font-bold uppercase tracking-wider text-black border-2 border-black"
            >
              {isAuthenticated ? "Sign out" : "Sign in"}
            </button>
          </div>
        </div>

        {/* Service chips — Midnight #0F172A active bg, Sulfur #EAFF00
            active text. Inactive chips stay white-on-black for contrast
            against the yellow panel. */}
        <div
          role="radiogroup"
          aria-label="Service type"
          className="flex gap-2 mb-4 overflow-x-auto"
        >
          {SERVICE_CHIPS.map((chip) => {
            const active = serviceType === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setServiceType(chip.id)}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-black whitespace-nowrap ${
                  active
                    ? "bg-[#0F172A] text-[#EAFF00]"
                    : "bg-white text-black"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

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
            {isAuthenticated ? "Request Ride" : "Sign in to Request"}
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
