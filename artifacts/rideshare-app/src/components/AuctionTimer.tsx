import { useEffect, useState } from "react";

interface AuctionTimerProps {
  duration?: number;
  isActive?: boolean;
  bidAccepted?: boolean;
  onExpire?: () => void;
  onTryAgain?: () => void;
}

export default function AuctionTimer({
  duration = 60,
  isActive = true,
  bidAccepted = false,
  onExpire,
  onTryAgain,
}: AuctionTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(duration);

  useEffect(() => {
    setSecondsLeft(duration);
  }, [duration, isActive]);

  useEffect(() => {
    if (!isActive || bidAccepted) return;
    if (secondsLeft <= 0) {
      onExpire?.();
      return;
    }
    const id = window.setTimeout(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => window.clearTimeout(id);
  }, [isActive, bidAccepted, secondsLeft, onExpire]);

  if (bidAccepted) return null;

  const expired = secondsLeft <= 0;
  const urgent = !expired && secondsLeft <= 10;

  if (expired) {
    return (
      <div className="w-full border-2 border-black bg-red-600 text-white p-4 text-center">
        <p className="text-base font-bold uppercase tracking-wider mb-3">
          No Drivers Found — Try Again
        </p>
        {onTryAgain && (
          <button
            type="button"
            onClick={onTryAgain}
            className="px-4 py-2 bg-white text-red-600 text-sm font-bold uppercase tracking-wider border-2 border-white hover:bg-gray-100"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, (secondsLeft / duration) * 100));

  return (
    <div className="w-full border-2 border-black bg-white p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[10px] font-bold text-black uppercase tracking-[0.2em]">
          Auction
        </span>
        <span
          className={`text-3xl font-mono font-black tabular-nums ${
            urgent ? "text-red-600" : "text-black"
          }`}
        >
          {String(secondsLeft).padStart(2, "0")}s
        </span>
      </div>
      <div className="h-2 w-full bg-gray-200 border border-black overflow-hidden">
        <div
          className={`h-full ${urgent ? "bg-red-600" : "bg-black"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
