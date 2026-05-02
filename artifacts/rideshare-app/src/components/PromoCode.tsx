import { useEffect, useRef, useState } from "react";
import { validatePromoCode, type Promotion } from "@/lib/api";

export interface PromoApplied {
  code: string;
  discountAmount: number;
  adjustedOffer: number;
  promotion: Promotion;
}

interface PromoCodeProps {
  /** Current base offer in SYP. The discount is subtracted from this. */
  baseOffer: number;
  /** Currently applied promo (controlled), or null. */
  applied: PromoApplied | null;
  onApply: (promo: PromoApplied) => void;
  onClear: () => void;
  className?: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "error"; message: string };

function formatSyp(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount) + " SYP";
}

export default function PromoCode({
  baseOffer,
  applied,
  onApply,
  onClear,
  className,
}: PromoCodeProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const reqIdRef = useRef(0);

  // If the base offer changes after a promo is applied, drop the promo so
  // the parent doesn't end up with a stale discount on a different price.
  useEffect(() => {
    if (applied && applied.adjustedOffer + applied.discountAmount !== baseOffer) {
      onClear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseOffer]);

  const handleApply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setStatus({ kind: "checking" });
    const reqId = ++reqIdRef.current;

    const result = await validatePromoCode(trimmed, baseOffer);

    // Drop stale responses (user typed a new code while we were waiting).
    if (reqId !== reqIdRef.current) return;

    if (!result.valid) {
      setStatus({ kind: "error", message: result.reason });
      return;
    }

    onApply({
      code: trimmed.toUpperCase(),
      discountAmount: result.discountAmount,
      adjustedOffer: result.adjustedOffer,
      promotion: result.promotion,
    });
    setStatus({ kind: "idle" });
    setCode("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleApply();
    }
  };

  /* ------------------------------------------------------------------ */
  /* Applied state                                                       */
  /* ------------------------------------------------------------------ */

  if (applied) {
    return (
      <section
        className={`border-2 border-black bg-yellow-400 text-black ${className ?? ""}`}
        aria-label="Applied promo code"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b-2 border-black">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-1.5 py-0.5 bg-black text-yellow-400 text-[10px] font-bold uppercase tracking-widest">
              Discount Applied
            </span>
            <code className="font-mono text-sm font-bold truncate">
              {applied.code}
            </code>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-bold uppercase tracking-wider underline hover:no-underline"
          >
            Remove
          </button>
        </div>

        <div className="px-3 py-2 text-xs space-y-0.5">
          {applied.promotion.description && (
            <p className="text-black/80">{applied.promotion.description}</p>
          )}
          <div className="flex items-baseline justify-between font-mono tabular-nums">
            <span className="text-black/70">Discount</span>
            <span className="font-bold">−{formatSyp(applied.discountAmount)}</span>
          </div>
          <div className="flex items-baseline justify-between font-mono tabular-nums">
            <span className="text-black/70">Suggested offer</span>
            <span className="text-base font-bold">
              {formatSyp(applied.adjustedOffer)}
            </span>
          </div>
        </div>

        <p className="px-3 pb-2 text-[10px] text-black/60 leading-tight">
          Suggested starting price · drivers may counter-offer.
        </p>
      </section>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Input state                                                         */
  /* ------------------------------------------------------------------ */

  const disabled =
    status.kind === "checking" ||
    !code.trim() ||
    !Number.isFinite(baseOffer) ||
    baseOffer <= 0;

  return (
    <section className={`${className ?? ""}`} aria-label="Promo code">
      <label
        htmlFor="promo-code-input"
        className="block text-[10px] font-bold uppercase tracking-widest text-black/60 mb-1"
      >
        Promo Code
      </label>
      <div className="flex gap-2">
        <input
          id="promo-code-input"
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (status.kind === "error") setStatus({ kind: "idle" });
          }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. FAST24LAUNCH"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="flex-1 px-3 py-2 border-2 border-black bg-white text-black text-sm font-mono uppercase tracking-wider focus:outline-none focus:bg-yellow-50"
        />
        <button
          type="button"
          onClick={() => void handleApply()}
          disabled={disabled}
          className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider border-2 border-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-[1px]"
        >
          {status.kind === "checking" ? "…" : "Apply"}
        </button>
      </div>

      {status.kind === "error" && (
        <p
          role="alert"
          className="mt-2 px-2 py-1 border-2 border-black bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider"
        >
          {status.message}
        </p>
      )}
    </section>
  );
}
