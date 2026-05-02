import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchDriverAvailability,
  setDriverOnline,
  type DriverAvailability,
} from "@/lib/api";

/* -------------------------------------------------------------------------- */
/* Hook: useDriverAvailability                                                */
/* -------------------------------------------------------------------------- */

export interface DriverAvailabilityState {
  /** True when the row has been loaded at least once (or default-initialized). */
  ready: boolean;
  /** Current presence — false until we know otherwise. */
  isOnline: boolean;
  /** True while a write is in flight. */
  saving: boolean;
  /** Last error from the most recent fetch / write, or null. */
  error: string | null;
  /** Toggle helper. Optimistic, with rollback on failure. */
  setOnline: (next: boolean) => Promise<void>;
}

/**
 * Source of truth for "is this driver currently accepting work?"
 *
 * - Reads the persisted row on mount (so a refresh restores presence).
 * - Subscribes to realtime updates on the driver's own row, so flipping the
 *   toggle on phone A is reflected on tablet B within a second. Without
 *   this, multi-device drivers see stale state and could wake up to ride
 *   requests on a device they thought was offline.
 * - Optimistic local update; rolls back on server error.
 *
 * Other hooks should treat `isOnline` as the canonical gate. Example:
 *
 *     const { isOnline } = useDriverAvailability(driverId);
 *     useNewRideRequests({ enabled: isOnline, onRequest });
 *
 * The `enabled: false` path inside the listener hook should NOT call
 * `supabase.channel(...).subscribe()` — keeping the websocket connection
 * idle is the whole point of going offline (battery + data savings).
 */
export function useDriverAvailability(
  driverId: string,
): DriverAvailabilityState {
  const [isOnline, setIsOnline] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    fetchDriverAvailability(driverId)
      .then((row) => {
        if (cancelled) return;
        setIsOnline(row?.is_online ?? false);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Couldn't load availability.",
        );
        setReady(true); // Don't block the UI forever on a fetch failure.
      });
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  // Realtime: keep multi-device sessions in sync.
  useEffect(() => {
    if (!driverId) return;
    const channel = supabase
      .channel(`driver_availability:${driverId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: "driver_availability",
          filter: `driver_id=eq.${driverId}`,
        },
        (payload: { new: DriverAvailability | null }) => {
          if (payload.new) setIsOnline(payload.new.is_online);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  const setOnline = useCallback(
    async (next: boolean) => {
      // Optimistic — flip immediately so the UI feels instant.
      const previous = isOnline;
      setIsOnline(next);
      setSaving(true);
      setError(null);
      try {
        await setDriverOnline(driverId, next);
      } catch (err) {
        // Roll back on failure.
        setIsOnline(previous);
        setError(
          err instanceof Error ? err.message : "Couldn't update availability.",
        );
      } finally {
        setSaving(false);
      }
    },
    [driverId, isOnline],
  );

  return { ready, isOnline, saving, error, setOnline };
}

/* -------------------------------------------------------------------------- */
/* Component: DriverOfflineToggle                                             */
/* -------------------------------------------------------------------------- */

export interface DriverOfflineToggleProps {
  /**
   * Layout variant. `"nav"` is a compact pill for the navigation bar (the
   * default per the prompt). `"card"` is a fuller version with status copy
   * for embedding inside a settings or driver-home block.
   */
  variant?: "nav" | "card";
  /**
   * Optional callback fired AFTER the persisted state changes successfully.
   * Use this to flush in-flight ride request listeners or analytics.
   */
  onChange?: (isOnline: boolean) => void;
  className?: string;
}

export default function DriverOfflineToggle({
  variant = "nav",
  onChange,
  className,
}: DriverOfflineToggleProps) {
  const { deviceId } = useUser();
  const { ready, isOnline, saving, error, setOnline } =
    useDriverAvailability(deviceId);

  // Stash latest onChange in a ref so we can call it from the toggle handler
  // without making the handler re-bind on every parent render.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleToggle = async () => {
    if (saving) return;
    const next = !isOnline;
    await setOnline(next);
    onChangeRef.current?.(next);
  };

  if (variant === "card") {
    return (
      <CardLayout
        ready={ready}
        isOnline={isOnline}
        saving={saving}
        error={error}
        onToggle={handleToggle}
        className={className}
      />
    );
  }

  return (
    <NavLayout
      ready={ready}
      isOnline={isOnline}
      saving={saving}
      error={error}
      onToggle={handleToggle}
      className={className}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Layouts                                                                    */
/* -------------------------------------------------------------------------- */

interface LayoutProps {
  ready: boolean;
  isOnline: boolean;
  saving: boolean;
  error: string | null;
  onToggle: () => void;
  className?: string;
}

function NavLayout({
  ready,
  isOnline,
  saving,
  error,
  onToggle,
  className,
}: LayoutProps) {
  const label = !ready
    ? "…"
    : saving
      ? "…"
      : isOnline
        ? "Online"
        : "Offline";

  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <button
        type="button"
        role="switch"
        aria-checked={isOnline}
        aria-label={isOnline ? "Go offline" : "Go online"}
        disabled={!ready || saving}
        onClick={onToggle}
        title={
          isOnline
            ? "Tap to stop receiving ride requests"
            : "Tap to start receiving ride requests"
        }
        className={`
          relative inline-flex items-center gap-2 px-2.5 py-1
          border-2 border-black text-[11px] font-bold uppercase tracking-widest
          active:translate-y-[1px] disabled:cursor-not-allowed
          transition-colors duration-100
          ${
            isOnline
              ? "bg-yellow-400 text-black shadow-[2px_2px_0_0_#000]"
              : "bg-black text-yellow-400"
          }
        `}
      >
        <span
          aria-hidden="true"
          className={`
            inline-block h-2 w-2 rounded-full
            ${isOnline ? "bg-green-600 animate-pulse" : "bg-yellow-400/60"}
          `}
        />
        <span className="tabular-nums">{label}</span>
      </button>

      {error && (
        <span
          role="alert"
          className="text-[10px] font-bold uppercase tracking-widest text-red-600 max-w-[8rem] truncate"
          title={error}
        >
          {error}
        </span>
      )}
    </div>
  );
}

function CardLayout({
  ready,
  isOnline,
  saving,
  error,
  onToggle,
  className,
}: LayoutProps) {
  return (
    <section
      className={`border-2 border-black bg-white ${className ?? ""}`}
      aria-labelledby="driver-availability-heading"
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b-2 border-black bg-black text-white">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
            Status
          </p>
          <h2
            id="driver-availability-heading"
            className="text-base font-bold uppercase tracking-wider"
          >
            {!ready ? "Loading…" : isOnline ? "You're Online" : "You're Offline"}
          </h2>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isOnline}
          aria-label={isOnline ? "Go offline" : "Go online"}
          disabled={!ready || saving}
          onClick={onToggle}
          className={`
            relative h-7 w-14 border-2 border-yellow-400
            disabled:cursor-not-allowed disabled:opacity-60
            ${isOnline ? "bg-yellow-400" : "bg-black"}
          `}
        >
          <span
            aria-hidden="true"
            className={`
              absolute top-[2px] h-4 w-4 border-2 border-yellow-400
              transition-all duration-150
              ${isOnline ? "left-[30px] bg-black" : "left-[2px] bg-yellow-400"}
            `}
          />
        </button>
      </header>

      <div className="px-3 py-2 space-y-1">
        <p className="text-[11px] text-black/70 leading-snug">
          {isOnline
            ? "You're receiving ride requests in your area. Real-time updates are running."
            : "Ride requests are paused. Your phone won't ping you and the app stops streaming new offers — saves battery and data."}
        </p>
        {saving && (
          <p className="text-[10px] uppercase tracking-widest text-black/50">
            Saving…
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="border-2 border-black bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-2 py-1"
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
