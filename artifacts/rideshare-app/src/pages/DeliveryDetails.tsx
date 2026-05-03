import { useState, type FormEvent } from "react";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export interface DeliveryDetailsValues {
  pickup: string;
  dropoff: string;
  /** Short freeform: "Small Box", "Documents", "Glass Vase". */
  itemDescription: string;
  /** Receiver's phone, free-form text (loosely validated). */
  receiverPhone: string;
  fragile: boolean;
  highValue: boolean;
  /**
   * Item's declared value in SYP. Optional — drivers use this to assess
   * liability. NEVER fed into the ride auction; the delivery price is
   * always the auction value. `null` when blank.
   */
  itemValueSyp: number | null;
  /** What the rider pays the driver. Drives the auction. */
  deliveryPriceSyp: number;
}

export interface DeliveryDetailsProps {
  /** Display label, e.g. "Package Delivery". */
  serviceLabel: string;
  initialValues?: Partial<DeliveryDetailsValues>;
  /** Submitted with validated values when the rider starts the auction. */
  onSubmit: (values: DeliveryDetailsValues) => void;
  onBack?: () => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

const MIN_DELIVERY_PRICE_SYP = 5_000;
const MAX_DELIVERY_PRICE_SYP = 5_000_000;
const MAX_ITEM_VALUE_SYP = 1_000_000_000; // 1B — declared item value, sanity cap

export default function DeliveryDetails({
  serviceLabel,
  initialValues,
  onSubmit,
  onBack,
  className,
}: DeliveryDetailsProps) {
  const [pickup, setPickup] = useState(initialValues?.pickup ?? "");
  const [dropoff, setDropoff] = useState(initialValues?.dropoff ?? "");
  const [itemDescription, setItemDescription] = useState(
    initialValues?.itemDescription ?? "",
  );
  const [receiverPhone, setReceiverPhone] = useState(
    initialValues?.receiverPhone ?? "",
  );
  const [fragile, setFragile] = useState(initialValues?.fragile ?? false);
  const [highValue, setHighValue] = useState(initialValues?.highValue ?? false);
  const [itemValueText, setItemValueText] = useState(
    initialValues?.itemValueSyp != null
      ? initialValues.itemValueSyp.toLocaleString("en-US")
      : "",
  );
  const [deliveryPriceText, setDeliveryPriceText] = useState(
    initialValues?.deliveryPriceSyp != null
      ? initialValues.deliveryPriceSyp.toLocaleString("en-US")
      : "",
  );
  const [error, setError] = useState<string | null>(null);

  const parsedDelivery = parsePrice(deliveryPriceText);
  const parsedItemValue = parsePrice(itemValueText); // null when blank — that's fine
  const phoneOk = isPlausiblePhone(receiverPhone);

  const canSubmit =
    pickup.trim().length > 0 &&
    dropoff.trim().length > 0 &&
    itemDescription.trim().length > 0 &&
    phoneOk &&
    parsedDelivery != null &&
    parsedDelivery >= MIN_DELIVERY_PRICE_SYP &&
    parsedDelivery <= MAX_DELIVERY_PRICE_SYP &&
    (parsedItemValue == null || parsedItemValue <= MAX_ITEM_VALUE_SYP);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Defensive validation — submit button is disabled when invalid, but a
    // user could still press Enter inside an input.
    if (!pickup.trim()) return setError("Pickup landmark is required.");
    if (!dropoff.trim()) return setError("Dropoff landmark is required.");
    if (!itemDescription.trim())
      return setError("Item description is required.");
    if (!phoneOk)
      return setError("Receiver's phone must contain at least 6 digits.");
    if (parsedDelivery == null)
      return setError("Delivery price must be a number in SYP.");
    if (parsedDelivery < MIN_DELIVERY_PRICE_SYP)
      return setError(
        `Delivery price must be at least ${MIN_DELIVERY_PRICE_SYP.toLocaleString("en-US")} SYP.`,
      );
    if (parsedDelivery > MAX_DELIVERY_PRICE_SYP)
      return setError(
        `Delivery price must be at most ${MAX_DELIVERY_PRICE_SYP.toLocaleString("en-US")} SYP.`,
      );
    if (parsedItemValue != null && parsedItemValue > MAX_ITEM_VALUE_SYP)
      return setError("Declared item value is implausibly high.");

    setError(null);
    onSubmit({
      pickup: pickup.trim(),
      dropoff: dropoff.trim(),
      itemDescription: itemDescription.trim(),
      receiverPhone: receiverPhone.trim(),
      fragile,
      highValue,
      itemValueSyp: parsedItemValue,
      deliveryPriceSyp: parsedDelivery,
    });
  };

  return (
    <main
      className={`min-h-screen w-full bg-[#EAFF00] text-black ${className ?? ""}`}
      aria-label={`Send ${serviceLabel}`}
    >
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
              Sending
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
        <TextField
          id="pickup"
          label="Pickup landmark"
          placeholder="e.g. Bab Touma flower shop"
          value={pickup}
          onChange={setPickup}
        />
        <TextField
          id="dropoff"
          label="Dropoff landmark"
          placeholder="e.g. Mezzeh, building 14"
          value={dropoff}
          onChange={setDropoff}
        />

        <TextField
          id="item-description"
          label="Item description"
          placeholder="e.g. Documents, small box, glass vase"
          value={itemDescription}
          onChange={setItemDescription}
          maxLength={120}
          help={`${itemDescription.length}/120`}
        />

        <TextField
          id="receiver-phone"
          label="Receiver's phone"
          placeholder="+963 9XX XXX XXX"
          value={receiverPhone}
          onChange={setReceiverPhone}
          inputMode="tel"
          autoComplete="tel"
        />

        {/* Two independent checkboxes — a package can be both fragile and
            high-value (e.g. a vintage glass piece). */}
        <fieldset className="border-2 border-black bg-white p-3">
          <legend className="px-2 text-[10px] font-bold uppercase tracking-widest">
            Special handling
          </legend>
          <div className="flex flex-col gap-2 mt-1">
            <Checkbox
              id="fragile"
              label="Fragile"
              checked={fragile}
              onChange={setFragile}
            />
            <Checkbox
              id="high-value"
              label="High Value"
              checked={highValue}
              onChange={setHighValue}
            />
          </div>
        </fieldset>

        {/* Item value (optional, metadata only) */}
        <PriceField
          id="item-value"
          label="Item value (SYP, optional)"
          help="What the item is worth. Drivers use this to gauge liability — it does NOT change the delivery price."
          value={itemValueText}
          onChange={setItemValueText}
          onClearError={() => error && setError(null)}
        />

        {/* Delivery price — drives the auction */}
        <PriceField
          id="delivery-price"
          label="Delivery price (SYP)"
          help="What you'll pay the driver. Drivers see this and bid; you confirm the winner."
          value={deliveryPriceText}
          onChange={setDeliveryPriceText}
          onClearError={() => error && setError(null)}
          required
        />

        {error && (
          <div
            role="alert"
            className="border-2 border-black bg-white px-3 py-2 text-[12px] font-bold uppercase tracking-wider"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full mt-2 bg-black text-yellow-400 border-2 border-black py-4 text-base font-bold uppercase tracking-[0.2em] hover:bg-[#0F172A] active:translate-y-[1px] disabled:bg-black/40 disabled:text-yellow-400/50 disabled:cursor-not-allowed"
          data-testid="submit-delivery"
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
/* Field primitives                                                           */
/* -------------------------------------------------------------------------- */

interface TextFieldProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (next: string) => void;
  inputMode?: "text" | "tel" | "numeric";
  autoComplete?: string;
  maxLength?: number;
  help?: string;
}

function TextField({
  id,
  label,
  placeholder,
  value,
  onChange,
  inputMode = "text",
  autoComplete = "off",
  maxLength,
  help,
}: TextFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] font-bold uppercase tracking-widest text-black/70"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-3 text-base bg-white border-2 border-black focus:outline-none focus:bg-yellow-50"
      />
      {help && (
        <p className="mt-1 text-[10px] text-black/60 tabular-nums">{help}</p>
      )}
    </div>
  );
}

interface PriceFieldProps {
  id: string;
  label: string;
  help?: string;
  value: string;
  onChange: (next: string) => void;
  onClearError: () => void;
  required?: boolean;
}

function PriceField({
  id,
  label,
  help,
  value,
  onChange,
  onClearError,
  required,
}: PriceFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] font-bold uppercase tracking-widest text-black/70"
      >
        {label}
      </label>
      <div className="mt-1 flex items-stretch border-2 border-black bg-white">
        <span
          aria-hidden="true"
          className="px-3 flex items-center text-[12px] font-bold uppercase tracking-widest bg-black text-yellow-400"
        >
          SYP
        </span>
        <input
          id={id}
          name={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={required}
          placeholder={required ? "25,000" : "Optional"}
          value={value}
          onChange={(e) => {
            onChange(formatPriceInput(e.target.value));
            onClearError();
          }}
          className="flex-1 px-3 py-3 text-base font-bold tabular-nums focus:outline-none focus:bg-yellow-50"
        />
      </div>
      {help && <p className="mt-1 text-[10px] text-black/60">{help}</p>}
    </div>
  );
}

interface CheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

function Checkbox({ id, label, checked, onChange }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2 px-3 py-2 border-2 border-black text-sm font-bold uppercase tracking-wider cursor-pointer select-none ${
        checked ? "bg-black text-yellow-400" : "bg-white text-black"
      }`}
    >
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-yellow-400"
      />
      {label}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatPriceInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  const trimmed = digits.slice(0, 10); // wider cap than RequestForm — item value
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-US");
}

function parsePrice(formatted: string): number | null {
  const digits = formatted.replace(/[^\d]/g, "");
  if (digits === "") return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Loose phone validator. We don't enforce country format — Syrian numbers
 * vs international vs landline all need to work, and false rejection is
 * worse than false acceptance for a freeform receiver field. Require ≥ 6
 * digits; allow leading +, spaces, parens, dashes.
 */
function isPlausiblePhone(raw: string): boolean {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length >= 6 && digits.length <= 15;
}
