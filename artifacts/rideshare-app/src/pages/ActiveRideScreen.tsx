import { useState, useEffect } from "react";

interface ActiveRideScreenProps {
  role: "rider" | "driver" | null;
  onEndRide: () => void;
}

export default function ActiveRideScreen({ role, onEndRide }: ActiveRideScreenProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const seconds = (elapsed % 60).toString().padStart(2, "0");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h1 className="text-base font-semibold text-gray-900">Ride in Progress</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="bg-gray-50 rounded-xl p-6 mb-6 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Elapsed time</p>
            <p className="text-4xl font-mono font-bold text-gray-900">
              {minutes}:{seconds}
            </p>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Role</span>
              <span className="text-sm font-medium text-gray-900 capitalize">{role ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Status</span>
              <span className="text-sm font-medium text-green-600">Active</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Destination</span>
              <span className="text-sm font-medium text-gray-900">Downtown</span>
            </div>
          </div>

          <button
            onClick={onEndRide}
            className="w-full py-3 px-4 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            End Ride
          </button>
        </div>
      </main>
    </div>
  );
}
