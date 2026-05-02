import { useCallback, useReducer, useSyncExternalStore } from "react";
import {
  isSoundEnabled,
  setSoundEnabled,
  playNewBidSound,
} from "@/lib/SoundUtility";
import {
  isVibrationEnabled,
  isVibrationSupported,
  setVibrationEnabled,
  vibrateNewBid,
} from "@/lib/VibrationUtility";

const DATA_SAVER_KEY = "data_saver_mode";
const DATA_SAVER_EVENT = "fast24:data-saver-changed";

/* -------------------------------------------------------------------------- */
/* Data Saver — small reactive store backed by localStorage + custom event.   */
/* Exposed so other components (RiderMap, LazyMap) can subscribe.             */
/* -------------------------------------------------------------------------- */

function readDataSaver(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DATA_SAVER_KEY) === "true";
  } catch {
    return false;
  }
}

export function setDataSaverMode(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(DATA_SAVER_KEY, "true");
    else localStorage.removeItem(DATA_SAVER_KEY);
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DATA_SAVER_EVENT));
  }
}

function subscribeDataSaver(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(DATA_SAVER_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(DATA_SAVER_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useDataSaverMode(): boolean {
  return useSyncExternalStore(
    subscribeDataSaver,
    readDataSaver,
    () => false,
  );
}

/* -------------------------------------------------------------------------- */
/* Settings screen                                                            */
/* -------------------------------------------------------------------------- */

interface AppSettingsProps {
  onClose?: () => void;
  className?: string;
}

export default function AppSettings({ onClose, className }: AppSettingsProps) {
  const dataSaver = useDataSaverMode();

  // Local mirrors so the toggles re-render. (The utilities own the source.)
  const sound = useSyncExternalStore(
    subscribeNoop,
    isSoundEnabled,
    () => true,
  );
  const vibration = useSyncExternalStore(
    subscribeNoop,
    isVibrationEnabled,
    () => true,
  );

  // Force re-render when toggles flip — the underlying utilities don't notify.
  const [, force] = useReducer((x: number) => x + 1, 0);

  const handleSound = useCallback(
    (next: boolean) => {
      setSoundEnabled(next);
      force();
      if (next) playNewBidSound(); // preview
    },
    [force],
  );

  const handleVibration = useCallback(
    (next: boolean) => {
      setVibrationEnabled(next);
      force();
      if (next) vibrateNewBid(); // preview
    },
    [force],
  );

  const handleDataSaver = useCallback((next: boolean) => {
    setDataSaverMode(next);
  }, []);

  return (
    <div className={`min-h-full bg-white text-black ${className ?? ""}`}>
      <header className="bg-black text-white px-4 py-3 border-b-2 border-black flex items-center justify-between sticky top-0 z-10">
        <h2 className="text-lg font-bold uppercase tracking-wider">Settings</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-yellow-400 text-black border-2 border-yellow-400 hover:bg-yellow-300"
          >
            Done
          </button>
        )}
      </header>

      <main className="p-4 space-y-3 max-w-md mx-auto">
        <SectionLabel>Notifications</SectionLabel>

        <ToggleRow
          label="Enable Sound Alerts"
          description="Play tones when a new bid arrives or you win an auction."
          checked={sound}
          onChange={handleSound}
        />

        <ToggleRow
          label="Enable Vibrations"
          description={
            isVibrationSupported()
              ? "Buzz on new bids and won auctions."
              : "Not supported on this device."
          }
          checked={vibration}
          onChange={handleVibration}
          disabled={!isVibrationSupported()}
        />

        <SectionLabel>Connection</SectionLabel>

        <ToggleRow
          label="Data Saver Mode"
          description="Disable the map and switch to a text-only interface for slow connections."
          checked={dataSaver}
          onChange={handleDataSaver}
          accent="alert"
        />

        {dataSaver && (
          <div
            role="status"
            className="border-2 border-black bg-yellow-400 px-3 py-2 text-xs font-bold uppercase tracking-wider text-black"
          >
            Data Saver is on — maps are disabled app-wide.
          </div>
        )}

        <p className="pt-4 text-[11px] text-black/40 font-mono">
          Settings are saved to this device.
        </p>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[10px] font-bold uppercase tracking-widest text-black/50">
      {children}
    </p>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  accent?: "default" | "alert";
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  accent = "default",
}: ToggleRowProps) {
  const onTrack =
    accent === "alert" ? "bg-red-600" : "bg-yellow-400";

  return (
    <label
      className={`flex items-start gap-3 p-3 border-2 border-black bg-white ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-yellow-100"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold uppercase tracking-wider text-black">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-xs text-black/60">{description}</p>
        )}
      </div>

      {/* Visually-hidden checkbox drives the switch */}
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        aria-label={label}
      />

      <span
        aria-hidden="true"
        className={`relative shrink-0 mt-0.5 w-12 h-7 border-2 border-black transition-colors ${
          checked ? onTrack : "bg-white"
        }`}
      >
        <span
          className={`absolute top-0 left-0 w-5 h-5 m-0.5 bg-black transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Tiny helpers                                                               */
/* -------------------------------------------------------------------------- */

function subscribeNoop(): () => void {
  return () => {};
}
