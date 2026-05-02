import { useState } from "react";
import ReportModal from "@/components/ReportModal";
import PriceDisplay from "@/components/PriceDisplay";

interface ActiveRideScreenProps {
  agreedPriceSyp: number;
  onReportProblem: () => void;
  onCompleteTrip: () => void;
}

export default function ActiveRideScreen({
  agreedPriceSyp,
  onReportProblem,
  onCompleteTrip,
}: ActiveRideScreenProps) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="min-h-screen w-screen bg-white flex flex-col">
      <section className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-md">
          <PriceDisplay amountSyp={agreedPriceSyp} />
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
