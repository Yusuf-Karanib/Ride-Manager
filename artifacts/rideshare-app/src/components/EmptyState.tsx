interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function EmptyState({
  title = "Searching for riders nearby…",
  subtitle = "We'll ping you the moment a ride request comes in.",
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center px-6 py-12 bg-white text-black ${
        className ?? ""
      }`}
    >
      {/* Radar */}
      <div
        className="fast24-radar relative w-48 h-48 sm:w-56 sm:h-56"
        aria-hidden="true"
      >
        {/* Concentric grid rings */}
        <span className="fast24-radar__ring" />
        <span className="fast24-radar__ring fast24-radar__ring--mid" />
        <span className="fast24-radar__ring fast24-radar__ring--inner" />

        {/* Crosshair */}
        <span className="fast24-radar__cross fast24-radar__cross--h" />
        <span className="fast24-radar__cross fast24-radar__cross--v" />

        {/* Sweeping pulses */}
        <span className="fast24-radar__pulse" />
        <span className="fast24-radar__pulse fast24-radar__pulse--delay-1" />
        <span className="fast24-radar__pulse fast24-radar__pulse--delay-2" />

        {/* Center dot */}
        <span className="fast24-radar__core" />
      </div>

      <h3 className="mt-6 text-base sm:text-lg font-bold uppercase tracking-wider text-black">
        {title}
      </h3>
      <p className="mt-1 text-sm text-black/60 max-w-xs">{subtitle}</p>

      <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 border-2 border-black bg-yellow-400">
        <span className="fast24-radar__live-dot" aria-hidden="true" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-black">
          Listening
        </span>
      </div>

      <style>{`
        .fast24-radar {
          display: grid;
          place-items: center;
        }
        .fast24-radar__ring,
        .fast24-radar__cross,
        .fast24-radar__pulse,
        .fast24-radar__core {
          position: absolute;
          border-radius: 9999px;
          pointer-events: none;
        }

        /* Static grid rings */
        .fast24-radar__ring {
          width: 100%;
          height: 100%;
          border: 2px solid #000;
          opacity: 0.18;
        }
        .fast24-radar__ring--mid {
          width: 66%;
          height: 66%;
          opacity: 0.28;
        }
        .fast24-radar__ring--inner {
          width: 33%;
          height: 33%;
          opacity: 0.45;
        }

        /* Crosshair */
        .fast24-radar__cross {
          background: #000;
          opacity: 0.15;
          border-radius: 0;
        }
        .fast24-radar__cross--h {
          width: 100%;
          height: 2px;
        }
        .fast24-radar__cross--v {
          width: 2px;
          height: 100%;
        }

        /* Expanding pulses */
        .fast24-radar__pulse {
          width: 28%;
          height: 28%;
          border: 2px solid #000;
          background: rgba(234, 255, 0, 0.35);
          opacity: 0;
          animation: fast24RadarPulse 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .fast24-radar__pulse--delay-1 { animation-delay: 0.8s; }
        .fast24-radar__pulse--delay-2 { animation-delay: 1.6s; }

        /* Solid yellow core */
        .fast24-radar__core {
          width: 14%;
          height: 14%;
          background: #EAFF00;
          border: 2px solid #000;
          box-shadow: 0 0 0 4px rgba(234, 255, 0, 0.4);
          animation: fast24RadarCore 1.4s ease-in-out infinite;
        }

        /* Live indicator dot */
        .fast24-radar__live-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #000;
          border-radius: 9999px;
          animation: fast24RadarBlink 1s ease-in-out infinite;
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
        @keyframes fast24RadarBlink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.2; }
        }

        @media (prefers-reduced-motion: reduce) {
          .fast24-radar__pulse,
          .fast24-radar__core,
          .fast24-radar__live-dot {
            animation: none;
          }
          .fast24-radar__pulse {
            opacity: 0.4;
            transform: scale(2);
          }
        }
      `}</style>
    </div>
  );
}
