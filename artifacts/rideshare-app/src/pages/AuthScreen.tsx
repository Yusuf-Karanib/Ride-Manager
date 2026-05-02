import { useState, type FormEvent } from "react";

interface AuthScreenProps {
  onAuthenticated: (email: string) => void;
  deviceId: string;
}

type Mode = "login" | "register";

export default function AuthScreen({ onAuthenticated, deviceId }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    onAuthenticated(email.trim());
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-black tracking-tight">
            {mode === "login" ? "Sign In" : "Create Account"}
          </h1>
          <p className="mt-2 text-sm text-black">
            {mode === "login"
              ? "Enter your email and password to continue"
              : "Register a new account to get started"}
          </p>
        </div>

        <div className="flex border-2 border-black mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 py-2 text-sm font-bold ${
              mode === "login" ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 py-2 text-sm font-bold border-l-2 border-black ${
              mode === "register" ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-black uppercase mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none focus:bg-yellow-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-black uppercase mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none focus:bg-yellow-100"
              placeholder="At least 6 characters"
            />
          </div>

          {mode === "register" && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-bold text-black uppercase mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none focus:bg-yellow-100"
                placeholder="Re-enter password"
              />
            </div>
          )}

          {error && (
            <div className="border-2 border-black bg-red-500 text-white px-3 py-2 text-xs font-bold">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-black text-white text-sm font-bold uppercase tracking-wider border-2 border-black hover:bg-white hover:text-black"
          >
            Authenticate
          </button>
        </form>

        <p className="mt-8 text-xs text-black text-center font-mono">
          Device ID: {deviceId.slice(0, 12)}…
        </p>
      </div>
    </div>
  );
}
