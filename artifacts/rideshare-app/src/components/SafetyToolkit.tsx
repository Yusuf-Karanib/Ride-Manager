import { useCallback, useEffect, useState } from "react";

export interface SafetyTripDetails {
  pickup: string;
  dropoff: string;
  finalPrice: number;
  driverName?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  rideId?: string;
}

interface SafetyToolkitProps {
  trip: SafetyTripDetails;
  /** Local emergency number. Defaults to 112 (universal). */
  emergencyNumber?: string;
  /** Tailwind positioning override; defaults to top-right of map. */
  className?: string;
}

type CopyState = "idle" | "copied" | "error";

function formatTripSummary(
  trip: SafetyTripDetails,
  timestamp: string,
): string {
  const lines = [
    "FAST24 — Trip Details",
    `Time: ${timestamp}`,
    `Pickup: ${trip.pickup}`,
    `Dropoff: ${trip.dropoff}`,
    `Agreed Price: ${new Intl.NumberFormat("en-US").format(trip.finalPrice)} SYP`,
  ];
  if (trip.driverName) lines.push(`Driver: ${trip.driverName}`);
  if (trip.vehicleModel || trip.vehiclePlate) {
    const car = [trip.vehicleModel, trip.vehiclePlate].filter(Boolean).join(" · ");
    lines.push(`Vehicle: ${car}`);
  }
  if (trip.rideId) lines.push(`Ride ID: ${trip.rideId}`);
  return lines.join("\n");
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy path.
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function SafetyToolkit({
  trip,
  emergencyNumber = "112",
  className,
}: SafetyToolkitProps) {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  // Close on Escape, lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Reset copy state whenever the sheet re-opens.
  useEffect(() => {
    if (open) setCopyState("idle");
  }, [open]);

  const handleShare = useCallback(async () => {
    const summary = formatTripSummary(trip, new Date().toLocaleString());

    // Prefer native share sheet on mobile (gives the user WhatsApp / SMS / etc).
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> })
          .share({ title: "FAST24 Trip Details", text: summary });
        setCopyState("copied");
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }

    const ok = await copyToClipboard(summary);
    setCopyState(ok ? "copied" : "error");
    try {
      navigator.vibrate?.(ok ? 60 : [80, 80, 80]);
    } catch {
      // ignore
    }
  }, [trip]);

  const handleEmergency = useCallback(() => {
    try {
      navigator.vibrate?.([100, 50, 100]);
    } catch {
      // ignore
    }
    // Use a same-frame anchor click so iOS Safari honors tel: links inside handlers.
    const a = document.createElement("a");
    a.href = `tel:${emergencyNumber}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [emergencyNumber]);

  return (
    <>
      {/* Floating shield trigger overlaying the map */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Safety Toolkit"
        title="Safety Toolkit"
        className={`absolute top-3 right-3 z-[1100] w-12 h-12 flex items-center justify-center bg-white border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-yellow-400 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_#000] ${
          className ?? ""
        }`}
      >
        <ShieldIcon className="w-6 h-6 text-black" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Safety Toolkit"
          className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center"
        >
          {/* Scrim */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          {/* Sheet */}
          <div className="relative w-full sm:max-w-md bg-white border-t-2 sm:border-2 border-black">
            <header className="flex items-center justify-between px-4 py-3 bg-black text-white border-b-2 border-black">
              <div className="flex items-center gap-2">
                <ShieldIcon className="w-5 h-5 text-yellow-400" />
                <h2 className="text-base font-bold uppercase tracking-wider">
                  Safety Toolkit
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Safety Toolkit"
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </header>

            <div className="p-4 space-y-3">
              {/* Share Trip Details */}
              <button
                type="button"
                onClick={() => void handleShare()}
                className="w-full flex items-start gap-3 p-3 border-2 border-black bg-white hover:bg-yellow-100 active:bg-yellow-400 text-left"
              >
                <ShareIcon className="w-6 h-6 text-black shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold uppercase tracking-wider text-black">
                    Share Trip Details
                  </p>
                  <p className="mt-0.5 text-xs text-black/70">
                    Send pickup, dropoff and agreed price to a contact.
                  </p>
                  {copyState === "copied" && (
                    <p
                      role="status"
                      className="mt-2 text-[11px] font-bold uppercase tracking-wider text-green-700"
                    >
                      Copied to clipboard
                    </p>
                  )}
                  {copyState === "error" && (
                    <p
                      role="alert"
                      className="mt-2 text-[11px] font-bold uppercase tracking-wider text-red-700"
                    >
                      Copy failed — please try again
                    </p>
                  )}
                </div>
              </button>

              {/* Emergency Call */}
              <button
                type="button"
                onClick={handleEmergency}
                className="w-full flex items-start gap-3 p-3 border-2 border-black bg-red-600 text-white hover:bg-red-700 active:bg-red-800 text-left"
              >
                <PhoneIcon className="w-6 h-6 text-white shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold uppercase tracking-wider">
                    Emergency Call
                  </p>
                  <p className="mt-0.5 text-xs text-white/90">
                    Dial local emergency services immediately.
                  </p>
                  <p className="mt-2 text-[11px] font-mono font-bold uppercase tracking-widest">
                    Call {emergencyNumber}
                  </p>
                </div>
              </button>

              {/* Trip preview */}
              <div className="p-3 border-2 border-black bg-gray-50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">
                  Trip Summary
                </p>
                <p className="mt-1 text-xs text-black">
                  <span className="font-bold">{trip.pickup}</span>
                  <span className="text-black/40 mx-1">→</span>
                  <span className="font-bold">{trip.dropoff}</span>
                </p>
                <p className="mt-1 text-xs font-mono tabular-nums">
                  {new Intl.NumberFormat("en-US").format(trip.finalPrice)} SYP
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Inline icons (no extra dep)                                                */
/* -------------------------------------------------------------------------- */

interface IconProps {
  className?: string;
}

function ShieldIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ShareIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

function PhoneIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
