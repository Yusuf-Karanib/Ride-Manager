interface CounterOffer {
  id: string;
  driverName: string;
  priceSyp: number;
}

interface RiderNegotiationProps {
  open: boolean;
  offers: CounterOffer[];
  onAccept: (offer: CounterOffer) => void;
  onClose: () => void;
}

export default function RiderNegotiation({
  open,
  offers,
  onAccept,
  onClose,
}: RiderNegotiationProps) {
  if (!open) return null;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US").format(price) + " SYP";

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white border-2 border-black flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black bg-yellow-400">
          <h2 className="text-base font-bold text-black uppercase tracking-wider">
            Counter-Offers
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-black text-sm font-bold hover:underline"
          >
            Close
          </button>
        </div>

        {offers.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-gray-500">Waiting for drivers to respond…</p>
          </div>
        ) : (
          <ul className="overflow-y-auto divide-y-2 divide-black">
            {offers.map((offer) => (
              <li
                key={offer.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-black truncate">
                    {offer.driverName}
                  </p>
                  <p className="text-base font-mono text-black">
                    {formatPrice(offer.priceSyp)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAccept(offer)}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-bold uppercase tracking-wider border-2 border-black hover:bg-green-700"
                >
                  Accept
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
