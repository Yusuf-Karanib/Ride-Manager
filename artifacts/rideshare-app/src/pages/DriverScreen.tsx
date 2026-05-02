import { useState } from "react";

interface DriverScreenProps {
  onAcceptedBid: (priceSyp: number) => void;
  onSignOut: () => void;
}

interface RideRequest {
  id: string;
  pickup: string;
  dropoff: string;
  initialOfferSyp: number;
}

const MOCK_REQUESTS: RideRequest[] = [
  { id: "r1", pickup: "Umayyad Square", dropoff: "Old City Gate", initialOfferSyp: 25000 },
  { id: "r2", pickup: "Kafarsouseh", dropoff: "Mezzeh Highway", initialOfferSyp: 18000 },
  { id: "r3", pickup: "Bab Touma", dropoff: "Damascus University", initialOfferSyp: 22000 },
  { id: "r4", pickup: "Abbasiyyin", dropoff: "Hamidiyah Souq", initialOfferSyp: 15000 },
  { id: "r5", pickup: "Malki", dropoff: "Sayyida Zeinab", initialOfferSyp: 40000 },
  { id: "r6", pickup: "Jaramana", dropoff: "Marjeh Square", initialOfferSyp: 30000 },
  { id: "r7", pickup: "Dummar Project", dropoff: "Yarmouk", initialOfferSyp: 35000 },
  { id: "r8", pickup: "Qassaa", dropoff: "Mazzeh 86", initialOfferSyp: 20000 },
];

const formatPrice = (n: number) => new Intl.NumberFormat("en-US").format(n) + " SYP";

export default function DriverScreen({ onAcceptedBid, onSignOut }: DriverScreenProps) {
  const [bids, setBids] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<Set<string>>(new Set());

  const handleBidChange = (id: string, value: string) => {
    setBids((prev) => ({ ...prev, [id]: value }));
  };

  const handleSendBid = (id: string) => {
    setSent((prev) => new Set(prev).add(id));
    const value = Number(bids[id]);
    if (!Number.isNaN(value) && value > 0) {
      onAcceptedBid(value);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden">
      <header className="border-b-2 border-black px-4 py-3 flex items-center justify-between bg-white">
        <div>
          <h1 className="text-base font-bold text-black uppercase tracking-wider">
            Available Rides
          </h1>
          <p className="text-xs text-gray-500">{MOCK_REQUESTS.length} open requests</p>
        </div>
        <button
          onClick={onSignOut}
          className="px-3 py-1.5 text-sm font-bold text-black border-2 border-black hover:bg-black hover:text-white"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {MOCK_REQUESTS.map((req) => {
          const isSent = sent.has(req.id);
          return (
            <article
              key={req.id}
              className="border-2 border-black bg-white p-4"
            >
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3">
                <div>
                  <p className="text-[10px] font-bold text-black uppercase tracking-wider">
                    Pickup
                  </p>
                  <p className="text-sm text-black">{req.pickup}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-black uppercase tracking-wider">
                    Dropoff
                  </p>
                  <p className="text-sm text-black">{req.dropoff}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-black uppercase tracking-wider">
                    Initial Offer (SYP)
                  </p>
                  <p className="text-base font-mono font-bold text-black">
                    {formatPrice(req.initialOfferSyp)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 items-stretch">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={bids[req.id] ?? ""}
                  onChange={(e) => handleBidChange(req.id, e.target.value)}
                  placeholder="Your bid"
                  disabled={isSent}
                  className="flex-1 min-w-0 px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => handleSendBid(req.id)}
                  disabled={isSent || !bids[req.id]}
                  className="px-4 py-2 bg-black text-white text-sm font-bold uppercase tracking-wider border-2 border-black hover:bg-gray-900 disabled:bg-gray-300 disabled:text-gray-500 disabled:border-gray-300"
                >
                  {isSent ? "Sent" : "Send Bid"}
                </button>
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
}
