import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { useUser } from "@/context/UserContext";
import { fetchDriverEarnings, type DriverEarning } from "@/lib/api";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const SULFUR = "#EAFF00";
const MIDNIGHT = "#0F172A";

const RANGES = {
  daily: { label: "Daily · 7 days", days: 7, bucket: "day" as const },
  weekly: { label: "Weekly · 6 weeks", days: 42, bucket: "week" as const },
};
type RangeKey = keyof typeof RANGES;

/* -------------------------------------------------------------------------- */
/* Date / format helpers                                                      */
/* -------------------------------------------------------------------------- */

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Returns the Monday at 00:00 of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  // getDay: 0=Sun..6=Sat. We want Mon=0..Sun=6.
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** "Mon 5", "Tue 6"… (short, dense — fits on phone-width axes). */
function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

/** "Apr 28" (week's Monday). */
function formatWeekLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** SYP amounts are large integers — thousands-separated, no decimals. */
function formatSYP(n: number): string {
  return `${n.toLocaleString("en-US")} SYP`;
}

/** Compact axis ticks: 12,500 → "12.5K", 1,200,000 → "1.2M". */
function compactSYP(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

/* -------------------------------------------------------------------------- */
/* Aggregation                                                                */
/* -------------------------------------------------------------------------- */

interface Bucket {
  /** Stable key for X-axis ordering. */
  key: string;
  label: string;
  earnings: number;
  trips: number;
  /** Bucket start, used for tooltips. */
  start: Date;
}

function buildBuckets(
  earnings: DriverEarning[],
  bucket: "day" | "week",
  span: number,
): Bucket[] {
  const today = new Date();
  const slots: Bucket[] = [];

  if (bucket === "day") {
    // Last `span` days, oldest → newest.
    for (let i = span - 1; i >= 0; i--) {
      const start = addDays(startOfDay(today), -i);
      slots.push({
        key: start.toISOString().slice(0, 10),
        label: formatDayLabel(start),
        earnings: 0,
        trips: 0,
        start,
      });
    }
  } else {
    // Last `span / 7` weeks, oldest → newest, by Monday.
    const weeks = Math.ceil(span / 7);
    const thisMonday = startOfWeek(today);
    for (let i = weeks - 1; i >= 0; i--) {
      const start = addDays(thisMonday, -i * 7);
      slots.push({
        key: start.toISOString().slice(0, 10),
        label: formatWeekLabel(start),
        earnings: 0,
        trips: 0,
        start,
      });
    }
  }

  // Index lookup by key for O(1) bucket assignment.
  const byKey = new Map(slots.map((s) => [s.key, s]));

  for (const e of earnings) {
    const d = new Date(e.completed_at);
    const slotStart = bucket === "day" ? startOfDay(d) : startOfWeek(d);
    const key = slotStart.toISOString().slice(0, 10);
    const slot = byKey.get(key);
    // Outside the window? (Shouldn't happen given the fetch filter, but be
    // defensive — clock skew, week boundary edge cases.)
    if (!slot) continue;
    slot.earnings += e.amount;
    slot.trips += 1;
  }

  return slots;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export interface DriverEarningsChartProps {
  className?: string;
}

export default function DriverEarningsChart({
  className,
}: DriverEarningsChartProps) {
  const { deviceId } = useUser();

  const [range, setRange] = useState<RangeKey>("daily");
  const [earnings, setEarnings] = useState<DriverEarning[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refetch when the range changes (window grows/shrinks → different `since`).
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setEarnings(null);

    const since = addDays(startOfDay(new Date()), -RANGES[range].days);
    fetchDriverEarnings(deviceId, since.toISOString())
      .then((rows) => {
        if (!cancelled) setEarnings(rows);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Couldn't load earnings.",
        );
        setEarnings([]);
      });

    return () => {
      cancelled = true;
    };
  }, [deviceId, range]);

  const buckets = useMemo(
    () =>
      earnings
        ? buildBuckets(earnings, RANGES[range].bucket, RANGES[range].days)
        : [],
    [earnings, range],
  );

  const totals = useMemo(() => {
    if (!earnings) return { total: 0, trips: 0, avg: 0, best: 0 };
    const total = earnings.reduce((s, e) => s + e.amount, 0);
    const trips = earnings.length;
    const avg = trips > 0 ? Math.round(total / trips) : 0;
    const best = buckets.reduce((m, b) => Math.max(m, b.earnings), 0);
    return { total, trips, avg, best };
  }, [earnings, buckets]);

  const isEmpty = earnings !== null && earnings.length === 0;
  const isLoading = earnings === null;

  return (
    <section
      className={`border-2 border-black bg-white ${className ?? ""}`}
      aria-labelledby="driver-earnings-heading"
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b-2 border-black bg-black text-white">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
            Earnings
          </p>
          <h2
            id="driver-earnings-heading"
            className="text-base font-bold uppercase tracking-wider"
          >
            {RANGES[range].label}
          </h2>
        </div>
        <RangeToggle range={range} onChange={setRange} />
      </header>

      <div className="p-3 space-y-3">
        <SummaryRow
          totalEarnings={totals.total}
          trips={totals.trips}
          avg={totals.avg}
        />

        {error && (
          <p
            role="alert"
            className="border-2 border-black bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-2 py-1"
          >
            {error}
          </p>
        )}

        {isLoading && (
          <div className="h-48 flex items-center justify-center border-2 border-dashed border-black/30 text-xs uppercase tracking-widest text-black/50">
            Loading…
          </div>
        )}

        {!isLoading && isEmpty && (
          <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-black/30 text-center px-4">
            <p className="text-xs font-bold uppercase tracking-widest text-black/60">
              No completed rides yet
            </p>
            <p className="mt-1 text-[11px] text-black/50">
              Earnings appear here once you complete your first cash trip.
            </p>
          </div>
        )}

        {!isLoading && !isEmpty && (
          <ChartBlock buckets={buckets} bucketKind={RANGES[range].bucket} />
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function RangeToggle({
  range,
  onChange,
}: {
  range: RangeKey;
  onChange: (r: RangeKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Earnings range"
      className="flex border-2 border-yellow-400"
    >
      {(Object.keys(RANGES) as RangeKey[]).map((k) => {
        const active = range === k;
        return (
          <button
            key={k}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(k)}
            className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
              active
                ? "bg-yellow-400 text-black"
                : "bg-black text-yellow-400 hover:bg-gray-800"
            }`}
          >
            {k === "daily" ? "Daily" : "Weekly"}
          </button>
        );
      })}
    </div>
  );
}

function SummaryRow({
  totalEarnings,
  trips,
  avg,
}: {
  totalEarnings: number;
  trips: number;
  avg: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat label="Total" value={formatSYP(totalEarnings)} highlight />
      <Stat label="Trips" value={String(trips)} />
      <Stat label="Avg / trip" value={trips > 0 ? formatSYP(avg) : "—"} />
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border-2 border-black px-2 py-1.5 ${
        highlight ? "bg-yellow-400" : "bg-white"
      }`}
    >
      <p className="text-[9px] font-bold uppercase tracking-widest text-black/60">
        {label}
      </p>
      <p className="text-sm font-bold text-black tabular-nums truncate">
        {value}
      </p>
    </div>
  );
}

function ChartBlock({
  buckets,
  bucketKind,
}: {
  buckets: Bucket[];
  bucketKind: "day" | "week";
}) {
  return (
    <div className="border-2 border-black bg-white p-2">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={buckets}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="#000"
              strokeDasharray="2 4"
              opacity={0.2}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: MIDNIGHT, fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: MIDNIGHT, strokeWidth: 2 }}
              interval={0}
            />
            <YAxis
              tickFormatter={compactSYP}
              tick={{ fontSize: 10, fill: MIDNIGHT, fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: MIDNIGHT, strokeWidth: 2 }}
              width={36}
            />
            <Tooltip
              cursor={{ fill: "rgba(234,255,0,0.2)" }}
              content={<EarningsTooltip bucketKind={bucketKind} />}
            />
            <Bar
              dataKey="earnings"
              fill={SULFUR}
              stroke={MIDNIGHT}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EarningsTooltip({
  active,
  payload,
  bucketKind,
}: TooltipProps<number, string> & { bucketKind: "day" | "week" }) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload as Bucket;
  return (
    <div className="border-2 border-black bg-black text-white px-2 py-1.5 shadow-[2px_2px_0_0_#EAFF00]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
        {bucketKind === "day" ? "Day" : "Week of"}
      </p>
      <p className="text-xs font-bold">{datum.label}</p>
      <p className="text-xs tabular-nums mt-1">{formatSYP(datum.earnings)}</p>
      <p className="text-[10px] text-white/70">
        {datum.trips} {datum.trips === 1 ? "trip" : "trips"}
      </p>
    </div>
  );
}
