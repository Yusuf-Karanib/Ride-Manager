interface DriverScreenProps {
  onGoOnline: () => void;
  onSignOut: () => void;
}

export default function DriverScreen({ onGoOnline, onSignOut }: DriverScreenProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">Driver</h1>
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to drive?</h2>
          <p className="text-sm text-gray-500 mb-8">Go online to start accepting ride requests</p>
          <button
            onClick={onGoOnline}
            className="w-full py-3 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go Online
          </button>
        </div>
      </main>
    </div>
  );
}
