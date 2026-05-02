import { useState } from "react";
import ReportModal from "@/components/ReportModal";

interface ActiveRideScreenProps {
  agreedPriceSyp: number;
  onReportProblem: () => void;
  onCompleteTrip: () => void;
}

const formatPrice = (n: number) => new Intl.NumberFormat("en-US").format(n);

export default function ActiveRideScreen({
  agreedPriceSyp,
  onReportProblem,
  onCompleteTrip,
}: ActiveRideScreenProps) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="min-h-screen w-screen bg-white flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <p className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-[0.3em] mb-4">
          Final Agreed Price
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-7xl sm:text-9xl font-black text-black leading-none tracking-tight">
            {formatPrice(agreedPriceSyp)}
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-gray-600">SYP</span>
        </div>
      </section>

      <section className="px-6 pb-10 space-y-3 max-w-md w-full mx-auto">
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="w-full py-4 bg-red-600 text-white text-base font-bold uppercase tracking-wider border-2 border-red-700 hover:bg-red-700"
        >
          Report Problem
        </button>
        <button
          type="button"
          onClick={onCompleteTrip}
          className="w-full py-4 bg-black text-white text-base font-bold uppercase tracking-wider border-2 border-black hover:bg-gray-900"
        >
          Complete Trip
        </button>
      </section>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmitted={() => {
          onReportProblem();
        }}
      />
    </div>
  );
}
