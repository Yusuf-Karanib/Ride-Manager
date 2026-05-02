import { useEffect, useRef, useState } from "react";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchLastNudgeAt,
  NUDGE_COOLDOWN_MS,
  NudgeCooldownError,
  sendNudge,
  type Nudge,
} from "@/lib/api";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export interface RideNudgeProps {
  /** Active ride id this nudge is bound to. */
  rideId: string;
  /**
   * Whether the ride is in a state that accepts nudges. The component will
   * still render disabled if false; pass true only while status is
   * 'matched' or 'active'.
   */
  enabled?: boolean;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* RideNudge button (rider side)                                              */
/* -------------------------------------------------------------------------- */

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; at: number }
  | { kind: "error"; message: string };

export default function RideNudge({
  rideId,
  enabled = true,
  className,
}: RideNudgeProps) {
  const { deviceId } = useUser();
  const [cooldownLeftMs, setCooldownLeftMs] = useState(0);
  const [send, setSend] = useState<SendState>({ kind: "idle" });

  // On mount and ride change: pull the most recent nudge to seed the cooldown.
  // Without this, a rider who refreshes mid-cooldown could re-spam immediately.
  useEffect(() => {
    let cancelled = false;
    fetchLastNudgeAt(rideId)
      .then((last) => {
        if (cancelled || !last) return;
        const elapsed = Date.now() - last.getTime();
        if (elapsed < NUDGE_COOLDOWN_MS) {
          setCooldownLeftMs(NUDGE_COOLDOWN_MS - elapsed);
        }
      })
      .catch(() => {
        /* Best-effort seed; don't block the user on the GET. */
      });
    return () => {
      cancelled = true;
    };
  }, [rideId]);

  // 1Hz cooldown countdown ticker. Always active when there's time left;
  // self-clears when it reaches zero.
  useEffect(() => {
    if (cooldownLeftMs <= 0) return;
    const id = window.setInterval(() => {
      setCooldownLeftMs((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownLeftMs]);

  // Auto-revert "sent" pulse to "idle" after 2s so the button doesn't stick
  // on the success state forever.
  useEffect(() => {
    if (send.kind !== "sent") return;
    const id = window.setTimeout(() => setSend({ kind: "idle" }), 2000);
    return () => window.clearTimeout(id);
  }, [send]);

  const onClick = async () => {
    if (!enabled || cooldownLeftMs > 0 || send.kind === "sending") return;
    setSend({ kind: "sending" });
    try {
      await sendNudge(rideId, deviceId);
      setSend({ kind: "sent", at: Date.now() });
      setCooldownLeftMs(NUDGE_COOLDOWN_MS);
    } catch (err) {
      if (err instanceof NudgeCooldownError) {
        setCooldownLeftMs(err.remainingMs);
        setSend({ kind: "idle" });
      } else {
        setSend({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Couldn't send the nudge.",
        });
      }
    }
  };

  const seconds = Math.ceil(cooldownLeftMs / 1000);
  const cooling = cooldownLeftMs > 0;
  const disabled = !enabled || cooling || send.kind === "sending";

  // Visual variant key
  const variant = !enabled
    ? "disabled"
    : send.kind === "sending"
      ? "sending"
      : send.kind === "sent"
        ? "sent"
        : cooling
          ? "cooling"
          : "ready";

  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-live="polite"
        className={`
          w-full flex items-center justify-center gap-2 py-3 px-3
          border-2 border-black text-sm font-bold uppercase tracking-wider
          active:translate-y-[1px] disabled:cursor-not-allowed
          transition-colors duration-100
          ${variantClasses(variant)}
        `}
      >
        <BellIcon ringing={variant === "sending" || variant === "sent"} />
        <span className="tabular-nums">{label(variant, seconds)}</span>
      </button>

      <p className="text-[10px] text-black/60 leading-tight px-1">
        {variant === "sent"
          ? "Driver was pinged. Give them a moment."
          : variant === "cooling"
            ? `Driver was just pinged — wait ${seconds}s before sending another.`
            : variant === "disabled"
              ? "Available once the driver is on the way."
              : "One urgency ping. Use sparingly — your driver is doing their best."}
      </p>

      {send.kind === "error" && (
        <p
          role="alert"
          className="border-2 border-black bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-2 py-1 mt-1"
        >
          {send.message}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* useNudgeListener — driver side                                             */
/* -------------------------------------------------------------------------- */

/**
 * Subscribes the driver app to nudge INSERTs for a specific ride. The
 * `onNudge` callback fires for every new nudge — wire it to a sound, a
 * vibration (`navigator.vibrate?.(200)`), and/or a toast.
 *
 * The callback is captured in a ref so the subscription doesn't tear down
 * and rebuild on every parent re-render.
 *
 * Pass `null` for `rideId` to disable (e.g. between rides).
 */
export function useNudgeListener(
  rideId: string | null,
  onNudge: (nudge: Nudge) => void,
): void {
  const cbRef = useRef(onNudge);
  cbRef.current = onNudge;

  useEffect(() => {
    if (!rideId) return;

    const channel = supabase
      .channel(`nudges:${rideId}`)
      .on(
        // postgres_changes is the realtime change-feed; filter on ride_id
        // so each driver only sees pings for their own active trip.
        "postgres_changes" as never,
        {
          event: "INSERT",
          schema: "public",
          table: "nudges",
          filter: `ride_id=eq.${rideId}`,
        },
        (payload: { new: Nudge }) => {
          cbRef.current(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId]);
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                  */
/* -------------------------------------------------------------------------- */

type Variant = "ready" | "sending" | "sent" | "cooling" | "disabled";

function variantClasses(v: Variant): string {
  switch (v) {
    case "ready":
      return "bg-yellow-400 text-black hover:bg-yellow-300 shadow-[3px_3px_0_0_#000]";
    case "sending":
      return "bg-yellow-300 text-black opacity-90";
    case "sent":
      return "bg-green-600 text-white";
    case "cooling":
      return "bg-gray-200 text-black/60 opacity-70";
    case "disabled":
      return "bg-gray-100 text-black/40";
  }
}

function label(v: Variant, seconds: number): string {
  switch (v) {
    case "ready":
      return "Nudge Driver";
    case "sending":
      return "Sending…";
    case "sent":
      return "✓ Sent";
    case "cooling":
      return `Wait ${seconds}s`;
    case "disabled":
      return "Nudge Driver";
  }
}

function BellIcon({ ringing }: { ringing: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="currentColor"
      aria-hidden="true"
      className={ringing ? "animate-pulse" : ""}
    >
      <path d="M8 1a1 1 0 011 1v.6A4.5 4.5 0 0112.5 7v3l1 2H2.5l1-2V7A4.5 4.5 0 017 2.6V2a1 1 0 011-1zm-1.5 13a1.5 1.5 0 003 0h-3z" />
    </svg>
  );
}
