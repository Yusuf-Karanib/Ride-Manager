interface RoleSelectScreenProps {
  email: string;
  onSelectRole: (role: "rider" | "driver") => void;
  onSignOut: () => void;
}

export default function RoleSelectScreen({
  email,
  onSelectRole,
  onSignOut,
}: RoleSelectScreenProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Choose Mode</h1>
          <p className="mt-2 text-sm text-gray-500">Signed in as {email}</p>
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

        <button
          onClick={onSignOut}
          className="mt-8 w-full text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
