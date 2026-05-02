import { useState } from "react";

const REASONS = [
  "Driver demanded more money",
  "Vehicle didn't match",
  "Unsafe driving",
] as const;

type Reason = (typeof REASONS)[number];

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted?: (reasons: Reason[]) => void;
}

export default function ReportModal({ open, onClose, onSubmitted }: ReportModalProps) {
  const [selected, setSelected] = useState<Set<Reason>>(new Set());

  if (!open) return null;

  const toggle = (reason: Reason) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(reason)) next.delete(reason);
      else next.add(reason);
      return next;
    });
  };

  const handleSubmit = () => {
    const reasons = Array.from(selected);
    console.log("[Report] Submitted report:", { reasons });
    onSubmitted?.(reasons);
    setSelected(new Set());
    onClose();
  };

  const handleClose = () => {
    setSelected(new Set());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white border-2 border-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black bg-red-600">
          <h2 className="text-base font-bold text-white uppercase tracking-wider">
            Report Problem
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-white text-sm font-bold hover:underline"
          >
            Close
          </button>
        </div>

        <ul className="divide-y-2 divide-black">
          {REASONS.map((reason) => {
            const isChecked = selected.has(reason);
            return (
              <li key={reason}>
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(reason)}
                    className="w-5 h-5 accent-black border-2 border-black"
                  />
                  <span className="text-sm font-bold text-black">{reason}</span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="px-4 py-3 border-t-2 border-black">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selected.size === 0}
            className="w-full py-3 bg-red-600 text-white text-sm font-bold uppercase tracking-wider border-2 border-red-700 hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:border-gray-300"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
