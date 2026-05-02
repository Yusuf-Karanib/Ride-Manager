import { Component, type ErrorInfo, type ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export interface AppErrorBoundaryProps {
  children: ReactNode;
  /**
   * Render-prop fallback. Receives the captured error and a `reset` function
   * that clears the boundary state. If omitted, the default brutalist
   * fallback UI is used.
   */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /**
   * Optional sink for telemetry. Called once per error AFTER the console log.
   * Wire to Sentry / LogRocket / etc. by passing `Sentry.captureException`.
   */
  onError?: (error: Error, info: ErrorInfo) => void;
  /**
   * When this value changes between renders, the boundary clears its error
   * state. Pass `useLocation()[0]` (wouter) or `pathname` (react-router) to
   * auto-reset on navigation.
   */
  resetKey?: unknown;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  info: ErrorInfo | null;
}

/* -------------------------------------------------------------------------- */
/* Boundary                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Top-level error boundary. Class component because React 19 has no hook
 * equivalent — `getDerivedStateFromError` + `componentDidCatch` only work
 * on classes.
 *
 * Wrap as high as possible inside the routing tree:
 *
 *   <BrowserRouter>
 *     <AppErrorBoundary>
 *       <UserProvider>
 *         <Routes> ... </Routes>
 *       </UserProvider>
 *     </AppErrorBoundary>
 *   </BrowserRouter>
 *
 * Wrapping OUTSIDE the router means a router crash is uncatchable;
 * wrapping inside catches everything routed.
 */
export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
    info: null,
  };

  // Phase 1: derive state synchronously so the next render shows the
  // fallback. Pure function — no side effects allowed here.
  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { hasError: true, error };
  }

  // Phase 2: side-effect phase. Console log + telemetry hookpoint.
  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Always log, regardless of dev/prod — the prompt requires it and a
    // visible console error is the bare minimum debug aid.
    console.error("[AppErrorBoundary] Unhandled error:", error);
    if (info.componentStack) {
      console.error(
        "[AppErrorBoundary] Component stack:",
        info.componentStack,
      );
    }
    this.setState({ info });
    try {
      this.props.onError?.(error, info);
    } catch (telemetryError) {
      // A buggy telemetry handler must NOT cascade and re-trigger the
      // boundary on its own fallback render. Swallow + log.
      console.error(
        "[AppErrorBoundary] onError handler threw:",
        telemetryError,
      );
    }
  }

  // Auto-reset when the parent's resetKey changes (typically route path).
  componentDidUpdate(prevProps: AppErrorBoundaryProps): void {
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.reset();
    }
  }

  /** Clears the error state so children get re-mounted. */
  reset = (): void => {
    this.setState({ hasError: false, error: null, info: null });
  };

  /** Hard refresh — destroys all in-memory state. */
  reload = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render(): ReactNode {
    const { hasError, error, info } = this.state;
    const { children, fallback } = this.props;

    if (!hasError || !error) return children;

    // Custom render-prop fallback wins if provided.
    if (fallback) return fallback(error, this.reset);

    return (
      <DefaultFallback
        error={error}
        info={info}
        onTryAgain={this.reset}
        onReload={this.reload}
      />
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Default fallback UI                                                        */
/* -------------------------------------------------------------------------- */

interface DefaultFallbackProps {
  error: Error;
  info: ErrorInfo | null;
  onTryAgain: () => void;
  onReload: () => void;
}

function DefaultFallback({
  error,
  info,
  onTryAgain,
  onReload,
}: DefaultFallbackProps) {
  // import.meta.env.DEV is statically replaced at build time, so the
  // production bundle won't even contain the dev-details JSX.
  const showDetails = import.meta.env.DEV;

  return (
    <main
      role="alert"
      aria-live="assertive"
      className="min-h-screen w-full bg-[#0F172A] text-white flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-white text-black border-2 border-black">
        {/* Header */}
        <header className="bg-black text-white px-4 py-3 border-b-2 border-black">
          <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
            FAST24
          </p>
          <h1 className="text-2xl font-bold uppercase tracking-wider mt-0.5">
            Something broke
          </h1>
        </header>

        {/* Body */}
        <div className="px-4 py-4">
          <p className="text-sm leading-snug">
            The app hit an unexpected error and stopped. Your ride and account
            data are safe.
          </p>

          {showDetails && (
            <details
              className="mt-3 border-2 border-black bg-gray-50"
              // Default-open in dev so the details are immediately visible
              // — the whole point of the dev block is fast debugging.
              open
            >
              <summary className="cursor-pointer px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-yellow-400 text-black border-b-2 border-black">
                Developer details
              </summary>
              <div className="px-2 py-2">
                <p className="text-[11px] font-bold text-red-700 break-words">
                  {error.name}: {error.message}
                </p>
                {error.stack && (
                  <pre className="mt-2 text-[10px] leading-tight overflow-auto max-h-40 font-mono text-black/70 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                )}
                {info?.componentStack && (
                  <>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-black/60">
                      Component stack
                    </p>
                    <pre className="mt-1 text-[10px] leading-tight overflow-auto max-h-40 font-mono text-black/70 whitespace-pre-wrap">
                      {info.componentStack}
                    </pre>
                  </>
                )}
              </div>
            </details>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={onReload}
              className="w-full px-4 py-2.5 border-2 border-black bg-yellow-400 text-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-yellow-400 active:translate-y-[1px]"
            >
              Reload app
            </button>
            <button
              type="button"
              onClick={onTryAgain}
              className="w-full px-4 py-2 border-2 border-black bg-white text-black text-[11px] font-bold uppercase tracking-widest hover:bg-yellow-400 active:translate-y-[1px]"
            >
              Try again without reload
            </button>
          </div>

          <p className="mt-3 text-[10px] text-black/50 text-center">
            If this keeps happening, contact support from the help screen.
          </p>
        </div>
      </div>
    </main>
  );
}
