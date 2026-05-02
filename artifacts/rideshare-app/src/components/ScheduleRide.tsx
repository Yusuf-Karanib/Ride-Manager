import { useMemo, useState } from "react";
import { useUser } from "@/context/UserContext";
import { scheduleRide } from "@/lib/api";

interface ScheduleRideProps {
  defaultPickup?: string;
  defaultDropoff?: string;
  defaultOffer?: number;
  onScheduled?: (id: string) => void;
  onCancel?: () => void;
  className?: string;
}

const MIN_LEAD_MINUTES = 30;
const MAX_DAYS_AHEAD = 14;

/** Returns "YYYY-MM-DDTHH:mm" in the user's local timezone. */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function formatHumanDelta(targetMs: number): string {
  const diff = targetMs - Date.now();
  if (diff <= 0) return "in the past";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `in ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs} h`;
  const days = Math.round(hrs / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; id: string }
  | { kind: "error"; message: string };

export default function ScheduleRide({
  defaultPickup = "",
  defaultDropoff = "",
  defaultOffer = 0,
  onScheduled,
  onCancel,
  className,
}: ScheduleRideProps) {
  const { deviceId } = useUser();

  // Sensible default: 1 hour from now, rounded to next 15-minute mark.
  const initialDateTime = useMemo(() => {
    const d = new Date(Date.now() + 60 * 60_000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return toLocalInputValue(d);
  }, []);

  const minDateTime = useMemo(() => {
    const d = new Date(Date.now() + MIN_LEAD_MINUTES * 60_000);
    return toLocalInputValue(d);
  }, []);

  const maxDateTime = useMemo(() => {
    const d = new Date(Date.now() + MAX_DAYS_AHEAD * 24 * 60 * 60_000);
    return toLocalInputValue(d);
  }, []);

  const [pickup, setPickup] = useState(defaultPickup);
  const [dropoff, setDropoff] = useState(defaultDropoff);
  const [offer, setOffer] = useState<string>(
    defaultOffer > 0 ? String(defaultOffer) : "",
  );
  const [dateTime, setDateTime] = useState(initialDateTime);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const scheduledMs = useMemo(() => new Date(dateTime).getTime(), [dateTime]);
  const offerNum = Number(offer);

  const validation = useMemo(() => {
    if (!pickup.trim()) return "Pickup is required.";
    if (!dropoff.trim()) return "Dropoff is required.";
    if (!Number.isFinite(offerNum) || offerNum <= 0)
      return "Initial offer must be greater than 0.";
    if (!Number.isFinite(scheduledMs))
      return "Pick a valid date and time.";
    if (scheduledMs - Date.now() < MIN_LEAD_MINUTES * 60_000)
      return `Schedule at least ${MIN_LEAD_MINUTES} minutes from now.`;
    if (scheduledMs - Date.now() > MAX_DAYS_AHEAD * 24 * 60 * 60_000)
      return `Can't schedule more than ${MAX_DAYS_AHEAD} days ahead.`;
    return null;
  }, [pickup, dropoff, offerNum, scheduledMs]);

  const canSubmit = !validation && status.kind !== "saving";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus({ kind: "saving" });
    try {
      const result = await scheduleRide({
        rider_id: deviceId,
        pickup: pickup.trim(),
        dropoff: dropoff.trim(),
        initial_offer: Math.round(offerNum),
        scheduled_at: new Date(scheduledMs).toISOString(),
        notes: notes.trim() || undefined,
      });
      setStatus({ kind: "saved", id: result.id });
      onScheduled?.(result.id);
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Couldn't save your scheduled ride.",
      });
    }
  };

  if (status.kind === "saved") {
    return (
      <div
        className={`min-h-full bg-white text-black p-4 ${className ?? ""}`}
      >
        <div className="border-2 border-black bg-yellow-400 p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-black/70">
            Scheduled
          </p>
          <p className="mt-2 text-base font-bold uppercase tracking-wider text-black">
            {pickup} → {dropoff}
          </p>
          <p className="mt-1 text-sm font-mono tabular-nums text-black">
            {new Date(scheduledMs).toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-black/70">
            {formatHumanDelta(scheduledMs)} · drivers notified ~30 min before
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setStatus({ kind: "idle" });
              setPickup("");
              setDropoff("");
              setOffer("");
              setNotes("");
              setDateTime(initialDateTime);
            }}
            className="flex-1 px-3 py-2 border-2 border-black bg-white text-black text-sm font-bold uppercase tracking-wider hover:bg-yellow-100"
          >
            Schedule Another
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-3 py-2 border-2 border-black bg-black text-white text-sm font-bold uppercase tracking-wider hover:bg-gray-800"
            >
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`min-h-full bg-white text-black ${className ?? ""}`}
    >
      <header className="bg-black text-white px-4 py-3 border-b-2 border-black flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">
          Schedule Ride
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-yellow-400 text-black border-2 border-yellow-400 hover:bg-yellow-300"
          >
            Cancel
          </button>
        )}
      </header>

      <div className="p-4 space-y-3 max-w-md mx-auto">
        <Field label="Pickup">
          <input
            type="text"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="e.g. Umayyad Square"
            className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none focus:bg-yellow-50"
            required
          />
        </Field>

        <Field label="Dropoff">
          <input
            type="text"
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
            placeholder="e.g. Damascus University"
            className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none focus:bg-yellow-50"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Initial Offer (SYP)">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="20000"
              className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm font-mono tabular-nums focus:outline-none focus:bg-yellow-50"
              required
            />
          </Field>

          <Field label="When">
            <input
              type="datetime-local"
              value={dateTime}
              min={minDateTime}
              max={maxDateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm font-mono focus:outline-none focus:bg-yellow-50"
              required
            />
          </Field>
        </div>

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the driver should know"
            rows={2}
            className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none focus:bg-yellow-50"
          />
        </Field>

        {/* Live time delta + lead-time disclosure */}
        <div className="border-2 border-black bg-gray-50 p-3 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-black/60">
            Schedule Summary
          </p>
          <p className="text-sm font-bold text-black">
            {Number.isFinite(scheduledMs)
              ? new Date(scheduledMs).toLocaleString()
              : "—"}
          </p>
          <p className="text-xs text-black/60 font-mono">
            {Number.isFinite(scheduledMs)
              ? formatHumanDelta(scheduledMs)
              : ""}
          </p>
          <p className="pt-1 text-[10px] text-black/50">
            Drivers see this request ~{MIN_LEAD_MINUTES} minutes before pickup.
          </p>
        </div>

        {validation && status.kind !== "saving" && (
          <p
            role="alert"
            className="border-2 border-black bg-red-600 text-white px-3 py-2 text-xs font-bold uppercase tracking-wider"
          >
            {validation}
          </p>
        )}

        {status.kind === "error" && (
          <p
            role="alert"
            className="border-2 border-black bg-red-600 text-white px-3 py-2 text-xs font-bold uppercase tracking-wider"
          >
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full px-4 py-3 bg-yellow-400 text-black border-2 border-black text-sm font-bold uppercase tracking-wider hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-[1px]"
        >
          {status.kind === "saving" ? "Saving…" : "Schedule Ride"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-black/60 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
