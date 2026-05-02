interface BannedScreenProps {
  deviceId: string;
}

export default function BannedScreen({ deviceId }: BannedScreenProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full mx-auto mb-6 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h1>
        <p className="text-sm text-gray-500 mb-8">
          This device has been suspended from the platform. If you believe this is a mistake,
          please contact support.
        </p>

        <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6">
          <p className="text-xs text-gray-400 mb-1">Device ID</p>
          <p className="text-xs font-mono text-gray-700 break-all">{deviceId}</p>
        </div>

        <a
          href="mailto:support@rideshare.example.com"
          className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
        >
          Contact support
        </a>
      </div>
    </div>
  );
}
