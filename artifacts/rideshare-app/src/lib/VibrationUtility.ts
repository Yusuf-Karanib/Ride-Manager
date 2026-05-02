const NEW_BID_PATTERN: number = 60;
const AUCTION_WON_PATTERN: number[] = [80, 100, 80];
const PREFERENCE_KEY = "vibration_enabled";

function isSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  );
}

function isEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const value = localStorage.getItem(PREFERENCE_KEY);
    return value === null ? true : value === "true";
  } catch {
    return true;
  }
}

function safeVibrate(pattern: number | number[]): boolean {
  if (!isSupported() || !isEnabled()) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

export function vibrateNewBid(): boolean {
  return safeVibrate(NEW_BID_PATTERN);
}

export function vibrateAuctionWon(): boolean {
  return safeVibrate(AUCTION_WON_PATTERN);
}

export function cancelVibration(): void {
  if (!isSupported()) return;
  try {
    navigator.vibrate(0);
  } catch {
    // ignore
  }
}

export function setVibrationEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFERENCE_KEY, enabled ? "true" : "false");
    if (!enabled) cancelVibration();
  } catch {
    // ignore
  }
}

export function isVibrationEnabled(): boolean {
  return isEnabled();
}

export function isVibrationSupported(): boolean {
  return isSupported();
}
