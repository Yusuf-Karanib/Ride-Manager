import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

/* ==========================================================================
 * FAST24 UI animation primitives — zero-dependency, CSS-driven.
 *
 * All animations honor `prefers-reduced-motion` and use scoped keyframes so
 * they cannot collide with anything else in the project.
 *
 * Components:
 *   <SlideUpModal>  — bottom-sheet style modal with scrim, used by negotiation.
 *   <RadarPulse>    — reusable pulsing-radar primitive (extracted from
 *                     EmptyState so any "searching…" surface can use it).
 *   <FadeIn>        — wraps children in a quick fade + lift on mount.
 *   <ScaleIn>       — wraps children in a quick scale + fade on mount.
 *   <PulseDot>      — tiny inline live indicator.
 * ======================================================================== */

/* -------------------------------------------------------------------------- */
/* SlideUpModal                                                                */
/* -------------------------------------------------------------------------- */

interface SlideUpModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Disable the backdrop click-to-close. */
  lockScrim?: boolean;
  className?: string;
}

export function SlideUpModal({
  open,
  onClose,
  title,
  children,
  lockScrim = false,
  className,
}: SlideUpModalProps) {
  // Keep the DOM mounted briefly after `open` flips false so the exit
  // animation can play before we fully unmount.
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // next frame: trigger the enter transition
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 280);
    return () => window.clearTimeout(t);
  }, [open]);

  // Body scroll lock + Escape close
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={lockScrim ? undefined : onClose}
        disabled={lockScrim}
        className={`absolute inset-0 transition-opacity duration-200 ease-out ${
          visible ? "opacity-100" : "opacity-0"
        } bg-black/60`}
      />

      <div
        className={`relative w-full sm:max-w-md bg-white border-t-2 sm:border-2 border-black
          transition-all duration-280 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${visible
            ? "translate-y-0 sm:scale-100 opacity-100"
            : "translate-y-full sm:translate-y-0 sm:scale-95 opacity-0"}
          motion-reduce:transition-none motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100
          ${className ?? ""}`}
      >
        {title && (
          <header className="flex items-center justify-between px-4 py-3 bg-black text-white border-b-2 border-black">
            <div className="text-base font-bold uppercase tracking-wider">
              {title}
            </div>
            {!lockScrim && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* RadarPulse                                                                  */
/* -------------------------------------------------------------------------- */

interface RadarPulseProps {
  /** Diameter in pixels. Defaults to 192. */
  size?: number;
  className?: string;
}

export function RadarPulse({ size = 192, className }: RadarPulseProps) {
  const style: CSSProperties = { width: size, height: size };
  return (
    <div
      aria-hidden="true"
      style={style}
      className={`fast24-radar relative ${className ?? ""}`}
    >
      <span className="fast24-radar__ring" />
      <span className="fast24-radar__ring fast24-radar__ring--mid" />
      <span className="fast24-radar__ring fast24-radar__ring--inner" />
      <span className="fast24-radar__cross fast24-radar__cross--h" />
      <span className="fast24-radar__cross fast24-radar__cross--v" />
      <span className="fast24-radar__pulse" />
      <span className="fast24-radar__pulse fast24-radar__pulse--delay-1" />
      <span className="fast24-radar__pulse fast24-radar__pulse--delay-2" />
      <span className="fast24-radar__core" />

      <style>{RADAR_CSS}</style>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PulseDot                                                                    */
/* -------------------------------------------------------------------------- */

interface PulseDotProps {
  color?: "black" | "yellow" | "red" | "green";
  size?: number;
  className?: string;
}

export function PulseDot({
  color = "black",
  size = 8,
  className,
}: PulseDotProps) {
  const bg =
    color === "yellow"
      ? "bg-yellow-400"
      : color === "red"
        ? "bg-red-600"
        : color === "green"
          ? "bg-green-600"
          : "bg-black";
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`inline-block rounded-full fast24-pulse-dot ${bg} ${className ?? ""}`}
    >
      <style>{PULSE_DOT_CSS}</style>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Mount-time enter wrappers                                                   */
/* -------------------------------------------------------------------------- */

interface EnterProps {
  children: ReactNode;
  delay?: number; // ms
  className?: string;
}

export function FadeIn({ children, delay = 0, className }: EnterProps) {
  const [in_, setIn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setIn(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={`transition-all duration-300 ease-out motion-reduce:transition-none ${
        in_ ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function ScaleIn({ children, delay = 0, className }: EnterProps) {
  const [in_, setIn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setIn(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={`transition-all duration-200 ease-out motion-reduce:transition-none ${
        in_ ? "opacity-100 scale-100" : "opacity-0 scale-95"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Scoped CSS                                                                  */
/* -------------------------------------------------------------------------- */

const RADAR_CSS = `
.fast24-radar { display: grid; place-items: center; }
.fast24-radar__ring,
.fast24-radar__cross,
.fast24-radar__pulse,
.fast24-radar__core {
  position: absolute; border-radius: 9999px; pointer-events: none;
}
.fast24-radar__ring { width: 100%; height: 100%; border: 2px solid #000; opacity: 0.18; }
.fast24-radar__ring--mid   { width: 66%; height: 66%; opacity: 0.28; }
.fast24-radar__ring--inner { width: 33%; height: 33%; opacity: 0.45; }
.fast24-radar__cross { background: #000; opacity: 0.15; border-radius: 0; }
.fast24-radar__cross--h { width: 100%; height: 2px; }
.fast24-radar__cross--v { width: 2px; height: 100%; }
.fast24-radar__pulse {
  width: 28%; height: 28%;
  border: 2px solid #000;
  background: rgba(234, 255, 0, 0.35);
  opacity: 0;
  animation: fast24RadarPulse 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
.fast24-radar__pulse--delay-1 { animation-delay: 0.8s; }
.fast24-radar__pulse--delay-2 { animation-delay: 1.6s; }
.fast24-radar__core {
  width: 14%; height: 14%;
  background: #EAFF00;
  border: 2px solid #000;
  box-shadow: 0 0 0 4px rgba(234, 255, 0, 0.4);
  animation: fast24RadarCore 1.4s ease-in-out infinite;
}
@keyframes fast24RadarPulse {
  0%   { transform: scale(0.4); opacity: 0; }
  15%  { opacity: 0.9; }
  100% { transform: scale(3.6); opacity: 0; }
}
@keyframes fast24RadarCore {
  0%, 100% { box-shadow: 0 0 0 4px rgba(234, 255, 0, 0.4); }
  50%      { box-shadow: 0 0 0 10px rgba(234, 255, 0, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .fast24-radar__pulse, .fast24-radar__core { animation: none; }
  .fast24-radar__pulse  { opacity: 0.4; transform: scale(2); }
}
`;

const PULSE_DOT_CSS = `
.fast24-pulse-dot { animation: fast24DotBlink 1s ease-in-out infinite; }
@keyframes fast24DotBlink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.2; }
}
@media (prefers-reduced-motion: reduce) {
  .fast24-pulse-dot { animation: none; }
}
`;
