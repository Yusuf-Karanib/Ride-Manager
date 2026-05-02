import { Component, type ErrorInfo, type ReactNode } from "react";

const RELOAD_DELAY_MS = 5000;

interface ErrorBoundaryProps {
  children: ReactNode;
  reloadDelayMs?: number;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  countdown: number;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private reloadTimerId: number | null = null;
  private tickIntervalId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      countdown: Math.ceil((props.reloadDelayMs ?? RELOAD_DELAY_MS) / 1000),
    };
  }

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] caught error:", error, info);
    this.props.onError?.(error, info);
    this.scheduleReload();
  }

  componentWillUnmount() {
    this.clearTimers();
  }

  private clearTimers() {
    if (this.reloadTimerId !== null) {
      window.clearTimeout(this.reloadTimerId);
      this.reloadTimerId = null;
    }
    if (this.tickIntervalId !== null) {
      window.clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }

  private scheduleReload() {
    if (typeof window === "undefined") return;
    const totalMs = this.props.reloadDelayMs ?? RELOAD_DELAY_MS;
    this.clearTimers();

    this.tickIntervalId = window.setInterval(() => {
      this.setState((prev) => ({
        countdown: Math.max(0, prev.countdown - 1),
      }));
    }, 1000);

    this.reloadTimerId = window.setTimeout(() => {
      this.clearTimers();
      window.location.reload();
    }, totalMs);
  }

  private handleReloadNow = () => {
    this.clearTimers();
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { countdown } = this.state;

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black text-white p-6"
      >
        <div className="max-w-sm w-full border-2 border-yellow-400 bg-black p-6 text-center">
          <div className="mb-4 inline-block bg-yellow-400 text-black text-xs font-bold uppercase tracking-wider px-2 py-1">
            FAST24
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">
            System Restarting
          </h1>
          <p className="text-sm text-gray-300 mb-4">
            Something went wrong. Reloading in{" "}
            <span className="tabular-nums font-bold text-yellow-400">
              {countdown}
            </span>
            …
          </p>
          <button
            type="button"
            onClick={this.handleReloadNow}
            className="w-full py-3 bg-yellow-400 text-black text-sm font-bold uppercase tracking-wider border-2 border-yellow-400 hover:bg-yellow-300"
          >
            Reload Now
          </button>
        </div>
      </div>
    );
  }
}
