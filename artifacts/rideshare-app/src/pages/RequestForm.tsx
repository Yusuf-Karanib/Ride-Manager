import { useState, type FormEvent } from "react";
import { LazyMapPicker } from "@/components/LazyMap";
import type { ServiceId } from "@/pages/ServicesHub";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export interface RequestFormValues {
  pickup: string;
  dropoff: string;
  /** Integer SYP. Empty input → null. Stripped of commas before parsing. */
  offerPriceSyp: number | null;
}

export interface RequestFormProps {
  serviceId: ServiceId;
  /** Display label for the header, e.g. "Standard Taxi". */
  serviceLabel: string;
  /** Pre-fill state — useful when restoring after an auth detour. */
  initialValues?: Partial<RequestFormValues>;
  /** Fired with validated values when user starts the auction. */
  onSubmit: (values: Required<RequestFormValues>) => void;
  /**
   * Called when the user wants to pick a location on a map. The parent
   * decides how to render the picker (modal, sheet, route, etc.) and calls
   * the provided resolver with the chosen landmark string.
   * `field` indicates which input the result should fill.
   */
  onPickOnMap?: (
    field: "pickup" | "dropoff",
    setValue: (landmark: string) => void,
  ) => void;
  /** Optional back button in the header. */
  onBack?: () => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

const MIN_PRICE_SYP = 5_000;
const MAX_PRICE_SYP = 5_000_000;

export default function RequestForm({
  serviceLabel,
  initialValues,
  onSubmit,
  onPickOnMap,
  onBack,
  className,
}: RequestFormProps) {
  const [pickup, setPickup] = useState(initialValues?.pickup ?? "");
  const [dropoff, setDropoff] = useState(initialValues?.dropoff ?? "");
  const [priceText, setPriceText] = useState(
    initialValues?.offerPriceSyp != null
      ? initialValues.offerPriceSyp.toLocaleString("en-US")
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  // Inline map expansion is scoped to the pickup field per the current
  // spec. Dropoff still uses its inline "Map" button which defers to the
  // parent's onPickOnMap callback (modal flow) if wired.
  const [pickupMapOpen, setPickupMapOpen] = useState(false);

  const parsedPrice = parsePriceInput(priceText);
  const canSubmit =
    pickup.trim().length > 0 &&
    dropoff.trim().length > 0 &&
    parsedPrice != null &&
    parsedPrice >= MIN_PRICE_SYP &&
    parsedPrice <= MAX_PRICE_SYP;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Defensive validation — the button is disabled when invalid, but a
    // user could still press Enter on a focused input. Show a specific
    // message rather than silently no-op.
    if (!pickup.trim()) return setError("Pickup landmark is required.");
    if (!dropoff.trim()) return setError("Dropoff landmark is required.");
    if (parsedPrice == null)
      return setError("Offer price must be a number in SYP.");
    if (parsedPrice < MIN_PRICE_SYP)
      return setError(
        `Offer must be at least ${MIN_PRICE_SYP.toLocaleString("en-US")} SYP.`,
      );
    if (parsedPrice > MAX_PRICE_SYP)
      return setError(
        `Offer must be at most ${MAX_PRICE_SYP.toLocaleString("en-US")} SYP.`,
      );
    setError(null);
    onSubmit({
      pickup: pickup.trim(),
      dropoff: dropoff.trim(),
      offerPriceSyp: parsedPrice,
    });
  };

  return (
    <main
      className={`min-h-screen w-full bg-[#EAFF00] text-black ${className ?? ""}`}
      aria-label={`Request ${serviceLabel}`}
    >
      {/* Header — black bar with sulfur eyebrow, mirrors ServicesHub */}
      <header className="bg-black text-white px-4 py-4 border-b-2 border-black flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="px-2 py-1 border-2 border-yellow-400 text-yellow-400 text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400 hover:text-black active:translate-y-[1px] shrink-0"
            >
              ← Back
            </button>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
              Requesting
            </p>
            <h1 className="text-xl font-bold uppercase tracking-wider mt-0.5 truncate">
              {serviceLabel}
            </h1>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="px-4 py-5 max-w-md mx-auto space-y-4"
        noValidate
      >
        {/* Pickup — inline map expansion lives below the field */}
        <div>
          <LandmarkField
            id="pickup"
            label="Pickup landmark"
            placeholder="e.g. Umayyad Square"
            value={pickup}
            onChange={setPickup}
            // Inline button suppressed; the prominent button below
            // replaces it for the pickup field.
            onPickOnMap={undefined}
          />
          <button
            type="button"
            onClick={() => setPickupMapOpen((open) => !open)}
            aria-expanded={pickupMapOpen}
            aria-controls="pickup-map-region"
            className="mt-2 w-full bg-black text-yellow-400 border-2 border-black py-3 text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-[#0F172A] active:translate-y-[1px] flex items-center justify-center gap-2"
          >
            <PinIcon />
            {pickupMapOpen ? "Hide Map" : "Select on Map"}
          </button>
          {pickupMapOpen && (
            <div
              id="pickup-map-region"
              className="mt-3 w-full border-2 border-black bg-white overflow-hidden"
              style={{ height: 360 }}
            >
              <LazyMapPicker
                mode="pickup"
                onConfirm={(landmark) => {
                  setPickup(landmark);
                  setPickupMapOpen(false);
                  if (error) setError(null);
                }}
                onCancel={() => setPickupMapOpen(false)}
              />
            </div>
          )}
        </div>

        {/* Dropoff */}
        <LandmarkField
          id="dropoff"
          label="Dropoff landmark"
          placeholder="e.g. Old Aleppo Souk"
          value={dropoff}
          onChange={setDropoff}
          onPickOnMap={
            onPickOnMap ? () => onPickOnMap("dropoff", setDropoff) : undefined
          }
        />

        {/* Offer price */}
        <div>
          <label
            htmlFor="price"
            className="block text-[10px] font-bold uppercase tracking-widest text-black/70"
          >
            Offer price (SYP)
          </label>
          <div className="mt-1 flex items-stretch border-2 border-black bg-white">
            <span
              aria-hidden="true"
              className="px-3 flex items-center text-[12px] font-bold uppercase tracking-widest bg-black text-yellow-400"
            >
              SYP
            </span>
            <input
              id="price"
              name="price"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="25,000"
              value={priceText}
              onChange={(e) => {
                setPriceText(formatPriceInput(e.target.value));
                if (error) setError(null);
              }}
              className="flex-1 px-3 py-3 text-base font-bold tabular-nums focus:outline-none focus:bg-yellow-50"
            />
          </div>
          <p className="mt-1 text-[10px] text-black/60">
            Drivers see your offer and bid. You confirm the winner.
          </p>
        </div>

        {/* Error / status row */}
        {error && (
          <div
            role="alert"
            className="border-2 border-black bg-white px-3 py-2 text-[12px] font-bold uppercase tracking-wider"
          >
            {error}
          </div>
        )}

        {/* Submit — large black brutalist button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full mt-2 bg-black text-yellow-400 border-2 border-black py-4 text-base font-bold uppercase tracking-[0.2em] hover:bg-[#0F172A] active:translate-y-[1px] disabled:bg-black/40 disabled:text-yellow-400/50 disabled:cursor-not-allowed"
        >
          Start Auction
        </button>

        <p className="text-[10px] text-black/60 text-center pt-1">
          Cash on arrival · Zero commission · No surge pricing
        </p>
      </form>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Landmark field with paired "Select on Map" affordance                      */
/* -------------------------------------------------------------------------- */

interface LandmarkFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  /** Omit to hide the "Select on Map" button (when no map picker is wired). */
  onPickOnMap?: () => void;
}

function LandmarkField({
  id,
  label,
  placeholder,
  value,
  onChange,
  onPickOnMap,
}: LandmarkFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] font-bold uppercase tracking-widest text-black/70"
      >
        {label}
      </label>
      <div className="mt-1 flex items-stretch gap-2">
        <input
          id={id}
          name={id}
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 px-3 py-3 text-base bg-white border-2 border-black focus:outline-none focus:bg-yellow-50"
        />
        {onPickOnMap && (
          <button
            type="button"
            onClick={onPickOnMap}
            aria-label={`Select ${label.toLowerCase()} on map`}
            className="shrink-0 px-3 bg-white border-2 border-black text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-yellow-400 active:translate-y-[1px] flex items-center gap-1.5"
          >
            <PinIcon />
            Map
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pin icon — inline SVG, no dep                                              */
/* -------------------------------------------------------------------------- */

function PinIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M8 1a5 5 0 0 0-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 0 0-5-5Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Price input helpers                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Strip commas, drop non-digits, re-insert grouping commas.
 * Empty string in → empty string out (lets the input clear cleanly).
 */
function formatPriceInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  // Cap at 9 digits — prevents accidental overflow and keeps the input
  // usable. The validator below will reject anything over MAX_PRICE_SYP.
  const trimmed = digits.slice(0, 9);
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-US");
}

function parsePriceInput(formatted: string): number | null {
  const digits = formatted.replace(/[^\d]/g, "");
  if (digits === "") return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}
