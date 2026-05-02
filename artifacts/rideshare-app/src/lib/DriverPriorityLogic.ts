export type DriverTier = "high" | "standard";

export const HIGH_RATING_THRESHOLD = 4.7;
export const STANDARD_DELAY_MS = 5000;

export function getDriverTier(rating: number | null | undefined): DriverTier {
  if (typeof rating !== "number" || Number.isNaN(rating)) return "standard";
  return rating >= HIGH_RATING_THRESHOLD ? "high" : "standard";
}

export function getDriverDelayMs(tier: DriverTier): number {
  return tier === "high" ? 0 : STANDARD_DELAY_MS;
}

export type Cancel = () => void;

export function withPriorityDelay<T>(
  tier: DriverTier,
  payload: T,
  deliver: (payload: T) => void,
): Cancel {
  if (tier === "high") {
    deliver(payload);
    return () => {};
  }
  const id = window.setTimeout(() => deliver(payload), STANDARD_DELAY_MS);
  return () => window.clearTimeout(id);
}

export interface PriorityDispatcher<T> {
  dispatch: (payload: T) => void;
  cancelAll: () => void;
}

export function createPriorityDispatcher<T>(
  tier: DriverTier,
  deliver: (payload: T) => void,
): PriorityDispatcher<T> {
  const pending = new Set<number>();

  return {
    dispatch(payload: T) {
      if (tier === "high") {
        deliver(payload);
        return;
      }
      const id = window.setTimeout(() => {
        pending.delete(id);
        deliver(payload);
      }, STANDARD_DELAY_MS);
      pending.add(id);
    },
    cancelAll() {
      for (const id of pending) {
        window.clearTimeout(id);
      }
      pending.clear();
    },
  };
}
