import { useMemo } from "react";
import {
  mockCompletedRides,
  type MockCompletedRide,
} from "@/lib/MockData";

interface DriverEarningsProps {
  rides?: MockCompletedRide[];
  className?: string;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatSyp(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount);
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DriverEarnings({
  rides = mockCompletedRides,
  className,
}: DriverEarningsProps) {
  const todayRides = useMemo(
    () =>
      rides
        .filter((r) => r.status === "completed" && isToday(r.completed_at))
        .sort(
          (a, b) =>
            new Date(b.completed_at).getTime() -
            new Date(a.completed_at).getTime(),
        ),
    [rides],
  );

  const total = useMemo(
    () => todayRides.reduce((sum, r) => sum + r.final_price, 0),
    [todayRides],
  );

  const tripCount = todayRides.length;
  const average = tripCount > 0 ? Math.round(total / tripCount) : 0;

  return (
    <div className={`min-h-full bg-white text-black ${className ?? ""}`}>
      <header className="bg-black text-white px-4 py-3 border-b-2 border-black">
        <h2 className="text-lg font-bold uppercase tracking-wider">
          Today's Earnings
        </h2>
        <p className="text-[11px] text-white/60 font-mono mt-0.5">
          Cash only · Zero commission · 100% yours
        </p>
      </header>

      {/* Hero total */}
      <section className="border-b-2 border-black bg-yellow-400 px-4 py-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-black/60">
          You Made
        </p>
        <p
          className="mt-1 text-5xl font-bold text-black tabular-nums leading-none"
          aria-label={`${total} Syrian Pounds`}
        >
          {formatSyp(total)}
        </p>
        <p className="mt-1 text-sm font-bold uppercase tracking-wider text-black">
          SYP
        </p>
      </section>

      {/* Stat strip */}
      <section className="grid grid-cols-2 border-b-2 border-black">
        <Stat label="Trips" value={String(tripCount)} />
        <Stat
          label="Avg / Trip"
          value={tripCount > 0 ? formatSyp(average) : "—"}
          borderLeft
        />
      </section>

      {/* Per-ride list */}
      <section>
        <div className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider">
          Trip Log
        </div>
        {todayRides.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-black/50">
              No completed rides yet today
            </p>
            <p className="mt-1 text-xs text-black/40">
              Your trips will show up here as you finish them.
            </p>
          </div>
        ) : (
          <ul className="divide-y-2 divide-black">
            {todayRides.map((r) => (
              <li
                key={r.id}
                className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-yellow-100"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-black truncate">
                    {r.pickup}
                    <span className="text-black/40 mx-1">→</span>
                    {r.dropoff}
                  </p>
                  <p className="mt-0.5 text-[11px] font-mono text-black/60">
                    {formatTime(r.completed_at)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-bold text-black tabular-nums">
                    {formatSyp(r.final_price)}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                    SYP
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  borderLeft,
}: {
  label: string;
  value: string;
  borderLeft?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3 ${borderLeft ? "border-l-2 border-black" : ""}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold text-black tabular-nums">
        {value}
      </p>
    </div>
  );
}
