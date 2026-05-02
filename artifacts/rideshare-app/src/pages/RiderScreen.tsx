import { useLocation } from "wouter";

interface RiderScreenProps {
  onRequestRide: () => void;
  onSignOut: () => void;
}

export default function RiderScreen({ onRequestRide, onSignOut }: RiderScreenProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">Rider</h1>
        <button
          onClick={onSignOut}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Where are you going?</h2>
          <p className="text-sm text-gray-500 mb-8">Request a ride to your destination</p>
          <button
            onClick={onRequestRide}
            className="w-full py-3 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Request a Ride
          </button>
        </div>
      </main>
    </div>
  );
}
