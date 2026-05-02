interface AuthScreenProps {
  onSelectRole: (role: "rider" | "driver") => void;
  deviceId: string;
}

export default function AuthScreen({ onSelectRole, deviceId }: AuthScreenProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome</h1>
          <p className="mt-2 text-sm text-gray-500">Choose how you want to continue</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onSelectRole("rider")}
            className="w-full py-3 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Continue as Rider
          </button>
          <button
            onClick={() => onSelectRole("driver")}
            className="w-full py-3 px-4 bg-white text-gray-900 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Continue as Driver
          </button>
        </div>

        <p className="mt-10 text-xs text-gray-400 text-center">
          Device ID: <span className="font-mono">{deviceId.slice(0, 8)}…</span>
        </p>
      </div>
    </div>
  );
}
