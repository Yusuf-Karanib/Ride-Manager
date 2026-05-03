import type { ServiceId } from "@/pages/ServicesHub";

type RideStatus = "completed" | "cancelled";

interface PastRide {
  id: string;
  /** ISO 8601 date string. Formatted at render time. */
  date: string;
  vehicle: ServiceId;
  finalPriceSyp: number;
  status: RideStatus;
}

const VEHICLE_LABEL: Record<ServiceId, string> = {
  taxi: "Standard Taxi",
  motorcycle: "Motorcycle",
  microbus: "Microbus",
  vip: "VIP Car",
  package: "Package Delivery",
};

// Mock history. Three trips covering both statuses and a mix of vehicle
// types so the card layout is exercised across cases.
const MOCK_HISTORY: PastRide[] = [
  {
    id: "r-001",
    date: "2026-05-02T18:42:00",
    vehicle: "taxi",
    finalPriceSyp: 28000,
    status: "completed",
  },
  {
    id: "r-002",
    date: "2026-04-29T08:15:00",
    vehicle: "motorcycle",
    finalPriceSyp: 12000,
    status: "cancelled",
  },
  {
    id: "r-003",
    date: "2026-04-21T22:05:00",
    vehicle: "microbus",
    finalPriceSyp: 9500,
    status: "completed",
  },
];

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function ActivityScreen() {
  return (
    <main className="min-h-screen w-full bg-white text-black">
      <header className="px-6 py-6 border-b-2 border-black">
        <h1 className="text-2xl font-bold uppercase tracking-wider">Activity</h1>
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-black/60">
          Your ride history
        </p>
      </header>

      <ul className="px-6 py-5 space-y-3" data-testid="activity-list">
        {MOCK_HISTORY.map((ride) => (
          <RideCard key={ride.id} ride={ride} />
        ))}
      </ul>
    </main>
  );
}

function RideCard({ ride }: { ride: PastRide }) {
  return (
    <li
      className="border-2 border-black bg-white p-4 flex items-start justify-between gap-4"
      data-testid={`ride-card-${ride.id}`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">
          {DATE_FMT.format(new Date(ride.date))}
        </p>
        <p className="mt-1 text-base font-bold uppercase tracking-wider truncate">
          {VEHICLE_LABEL[ride.vehicle]}
        </p>
        <p className="mt-1 text-sm font-bold tabular-nums">
          {ride.finalPriceSyp.toLocaleString("en-US")}{" "}
          <span className="text-[10px] tracking-widest text-black/60">SYP</span>
        </p>
      </div>
      <StatusBadge status={ride.status} />
    </li>
  );
}

function StatusBadge({ status }: { status: RideStatus }) {
  // Brutalist take on green/red: black border, bold uppercase, color
  // applied to text rather than a soft fill. Fits the white card.
  const isCompleted = status === "completed";
  return (
    <span
      className={`shrink-0 px-2 py-1 border-2 border-black text-[10px] font-bold uppercase tracking-widest ${
        isCompleted ? "text-green-600" : "text-red-600"
      }`}
    >
      {isCompleted ? "Completed" : "Cancelled"}
    </span>
  );
}
