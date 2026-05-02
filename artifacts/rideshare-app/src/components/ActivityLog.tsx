import { useCallback, useEffect, useMemo, useState } from "react";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export type ActivityEventType =
  | "ride_completed"
  | "ride_canceled"
  | "bid_accepted"
  | "bid_rejected"
  | "bid_placed"
  | "wallet_funded"
  | "profile_updated"
  | "signed_in";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Optional override for the headline; defaults derived from `type`. */
  title?: string;
  /** Optional secondary line: route, counterparty, status reason, etc. */
  detail?: string;
  /** Optional amount in SYP — rendered with thousands separator. */
  amountSyp?: number;
}

export interface ActivityLogProps {
  /** External event source. If omitted, the localStorage-backed mock is used. */
  events?: ActivityEvent[];
  /** Hard cap on rendered items (default 50). Prevents pathological lists. */
  maxItems?: number;
  /** Show an "Empty timeline" placeholder when there are zero events. */
  showEmptyState?: boolean;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Mock data layer                                                            */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "fast24_activity_log_v1";
const STORAGE_EVENT = "fast24:activity";

function readStored(): ActivityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDemoEvents();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Defensive shape check — corrupted blobs shouldn't crash the timeline.
    return parsed.filter(
      (e): e is ActivityEvent =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as ActivityEvent).id === "string" &&
        typeof (e as ActivityEvent).type === "string" &&
        typeof (e as ActivityEvent).timestamp === "string",
    );
  } catch {
    return [];
  }
}

function writeStored(events: ActivityEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    /* quota / private mode — silently drop, log is best-effort */
  }
}

/**
 * Append an event to the local mock log. Returns the stored event so callers
 * can confirm the assigned id/timestamp. Safe to call from any handler.
 *
 * Production swap: replace the body with an `insert` against an `activity`
 * table; keep the signature identical.
 */
export function recordActivity(
  partial: Omit<ActivityEvent, "id" | "timestamp"> &
    Partial<Pick<ActivityEvent, "id" | "timestamp">>,
): ActivityEvent {
  const event: ActivityEvent = {
    id: partial.id ?? `act_${crypto.randomUUID()}`,
    timestamp: partial.timestamp ?? new Date().toISOString(),
    type: partial.type,
    title: partial.title,
    detail: partial.detail,
    amountSyp: partial.amountSyp,
  };
  const next = [event, ...readStored()].slice(0, 200); // hard cap on storage
  writeStored(next);
  if (typeof window !== "undefined") {
    // Notify same-tab subscribers; the native `storage` event only fires
    // across tabs, not within the same one.
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
  }
  return event;
}

/** Wipe the local log. Useful for a "Clear history" affordance. */
export function clearActivity(): void {
  writeStored([]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
  }
}

/**
 * Subscribes to the local mock log. Same-tab updates fire via custom event;
 * cross-tab updates fire via the native `storage` event.
 */
export function useActivityLog(): ActivityEvent[] {
  const [events, setEvents] = useState<ActivityEvent[]>(() => readStored());

  useEffect(() => {
    const refresh = () => setEvents(readStored());
    window.addEventListener(STORAGE_EVENT, refresh);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(STORAGE_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return events;
}

/**
 * Seed a few demo events on first load so an empty install doesn't show an
 * empty timeline. Notably absent: `wallet_funded` — this app is cash-only,
 * faking funded entries would be misleading.
 */
function seedDemoEvents(): ActivityEvent[] {
  const now = Date.now();
  const min = 60_000;
  const hr = 3_600_000;
  const day = 86_400_000;
  const seed: ActivityEvent[] = [
    {
      id: "act_seed_1",
      type: "ride_completed",
      timestamp: new Date(now - 15 * min).toISOString(),
      detail: "Mezzeh → Old City",
      amountSyp: 18000,
    },
    {
      id: "act_seed_2",
      type: "bid_rejected",
      timestamp: new Date(now - 2 * hr).toISOString(),
      detail: "Driver counter too high",
      amountSyp: 22000,
    },
    {
      id: "act_seed_3",
      type: "bid_placed",
      timestamp: new Date(now - 5 * hr).toISOString(),
      detail: "Sha'alan → Damascus University",
      amountSyp: 9000,
    },
    {
      id: "act_seed_4",
      type: "profile_updated",
      timestamp: new Date(now - 1 * day - 2 * hr).toISOString(),
      detail: "Updated phone number",
    },
    {
      id: "act_seed_5",
      type: "signed_in",
      timestamp: new Date(now - 3 * day).toISOString(),
      detail: "New device",
    },
  ];
  writeStored(seed);
  return seed;
}

/* -------------------------------------------------------------------------- */
/* Time helpers                                                               */
/* -------------------------------------------------------------------------- */

const REL = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relTime(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diffSec = Math.round((t - now) / 1000); // negative for past
  const abs = Math.abs(diffSec);
  if (abs < 45) return "just now";
  if (abs < 3600) return REL.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return REL.format(Math.round(diffSec / 3600), "hour");
  if (abs < 604800) return REL.format(Math.round(diffSec / 86400), "day");
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function dayBucket(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekAgo = new Date(today.getTime() - 6 * 86_400_000);
  if (d >= today) return "Today";
  if (d >= yesterday) return "Yesterday";
  if (d >= weekAgo)
    return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/* Per-type metadata — title, swatch color, glyph                             */
/* -------------------------------------------------------------------------- */

interface TypeMeta {
  title: string;
  swatch: string; // tailwind bg-* class for the dot
  glyph: string; // single emoji-free symbol for accessible alt text
}

const TYPE_META: Record<ActivityEventType, TypeMeta> = {
  ride_completed: {
    title: "Ride Completed",
    swatch: "bg-green-600",
    glyph: "✓",
  },
  ride_canceled: { title: "Ride Canceled", swatch: "bg-red-600", glyph: "×" },
  bid_accepted: { title: "Bid Accepted", swatch: "bg-green-600", glyph: "↑" },
  bid_rejected: { title: "Bid Rejected", swatch: "bg-red-600", glyph: "↓" },
  bid_placed: {
    title: "Bid Placed",
    swatch: "bg-yellow-400",
    glyph: "•",
  },
  wallet_funded: {
    title: "Wallet Funded",
    swatch: "bg-yellow-400",
    glyph: "$",
  },
  profile_updated: {
    title: "Profile Updated",
    swatch: "bg-gray-500",
    glyph: "i",
  },
  signed_in: { title: "Signed In", swatch: "bg-gray-500", glyph: "→" },
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ActivityLog({
  events,
  maxItems = 50,
  showEmptyState = true,
  className,
}: ActivityLogProps) {
  const fallback = useActivityLog();
  const source = events ?? fallback;

  // Sort newest-first (defensively — caller may have unordered data) and cap.
  const items = useMemo(() => {
    return [...source]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, maxItems);
  }, [source, maxItems]);

  // Group consecutive items by day bucket. Order is preserved from the
  // sorted list so each bucket appears at most once and stays in the right
  // chronological position.
  const grouped = useMemo(() => {
    const groups: Array<{ label: string; items: ActivityEvent[] }> = [];
    let current: { label: string; items: ActivityEvent[] } | null = null;
    for (const event of items) {
      const label = dayBucket(event.timestamp);
      if (!current || current.label !== label) {
        current = { label, items: [] };
        groups.push(current);
      }
      current.items.push(event);
    }
    return groups;
  }, [items]);

  // Re-render every minute so "5 min ago" labels age correctly without
  // requiring an explicit user interaction.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const handleClear = useCallback(() => {
    if (events) return; // controlled mode — caller owns the data
    if (
      window.confirm(
        "Clear all activity history on this device? This cannot be undone.",
      )
    ) {
      clearActivity();
    }
  }, [events]);

  return (
    <section
      className={`bg-white border-2 border-black overflow-hidden ${className ?? ""}`}
      aria-label="Activity timeline"
    >
      {/* Header */}
      <header className="bg-black text-white px-4 py-3 border-b-2 border-black flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
            FAST24
          </p>
          <h2 className="text-2xl font-bold uppercase tracking-wider mt-0.5">
            Activity
          </h2>
        </div>
        {!events && items.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-1 border-2 border-yellow-400 bg-transparent text-yellow-400 text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400 hover:text-black active:translate-y-[1px]"
          >
            Clear
          </button>
        )}
      </header>

      {/* Body */}
      {items.length === 0 ? (
        showEmptyState ? (
          <div className="px-4 py-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-black/60">
              No activity yet
            </p>
            <p className="mt-1 text-[11px] text-black/50">
              Your rides, bids, and account changes will show up here.
            </p>
          </div>
        ) : null
      ) : (
        <ol className="px-4 pt-3 pb-4">
          {grouped.map((group) => (
            <li key={group.label} className="mb-2">
              {/* Day label */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/50 mt-3 mb-1.5">
                {group.label}
              </p>
              {/* Items in this bucket. Each carries the dotted left rail; with
                  zero vertical gap between them the rails butt-join into a
                  continuous dotted line. */}
              <ul>
                {group.items.map((event, idx) => (
                  <TimelineItem
                    key={event.id}
                    event={event}
                    isFirstInGroup={idx === 0}
                    isLastInGroup={idx === group.items.length - 1}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Row                                                                        */
/* -------------------------------------------------------------------------- */

interface TimelineItemProps {
  event: ActivityEvent;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

function TimelineItem({
  event,
  isFirstInGroup,
  isLastInGroup,
}: TimelineItemProps) {
  const meta = TYPE_META[event.type] ?? {
    title: event.type,
    swatch: "bg-gray-500",
    glyph: "•",
  };
  const headline = event.title ?? meta.title;
  const amount =
    typeof event.amountSyp === "number"
      ? `${event.amountSyp.toLocaleString()} SYP`
      : null;

  return (
    <li className="relative pl-6 pr-1">
      {/* Dotted rail. `border-l-2 border-dotted` renders evenly-spaced dots.
          We extend it from top:0 to bottom:0 except on the very first/last
          row of a group, where we trim it slightly so the rail visually
          starts/ends at the dot rather than the row edge. */}
      <span
        aria-hidden="true"
        className="absolute left-2 border-l-2 border-dotted border-black/40"
        style={{
          top: isFirstInGroup ? "8px" : 0,
          bottom: isLastInGroup ? "calc(100% - 16px)" : 0,
        }}
      />
      {/* Type swatch — sits ON the rail */}
      <span
        aria-hidden="true"
        className={`absolute left-[2px] top-[6px] h-3 w-3 rounded-full border-2 border-black ${meta.swatch} flex items-center justify-center text-[8px] font-bold leading-none text-black`}
      >
        <span className="sr-only">{meta.glyph}</span>
      </span>

      {/* Card */}
      <div className="py-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[12px] font-bold uppercase tracking-wider text-black truncate">
            {headline}
          </p>
          <time
            dateTime={event.timestamp}
            className="text-[10px] text-black/50 whitespace-nowrap"
          >
            {relTime(event.timestamp)}
          </time>
        </div>
        {(event.detail || amount) && (
          <p className="mt-0.5 text-[11px] text-black/70 leading-snug">
            {event.detail}
            {event.detail && amount && (
              <span className="text-black/30"> · </span>
            )}
            {amount && <span className="font-mono">{amount}</span>}
          </p>
        )}
      </div>
    </li>
  );
}
