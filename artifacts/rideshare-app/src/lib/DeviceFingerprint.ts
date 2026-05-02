const STORAGE_KEY = "device_fingerprint";

const FONTS_TO_PROBE = [
  "Arial",
  "Arial Black",
  "Calibri",
  "Cambria",
  "Comic Sans MS",
  "Consolas",
  "Courier New",
  "Georgia",
  "Helvetica",
  "Helvetica Neue",
  "Impact",
  "Lucida Console",
  "Lucida Sans Unicode",
  "Menlo",
  "Monaco",
  "Palatino",
  "Segoe UI",
  "Tahoma",
  "Times",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
  "San Francisco",
  "Roboto",
  "Inter",
];

const BASE_FONTS = ["monospace", "sans-serif", "serif"] as const;
const PROBE_TEXT = "mmmmmmmmmmlli";
const PROBE_SIZE = "72px";

function detectFonts(): string[] {
  if (typeof document === "undefined") return [];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const baseline: Record<string, { width: number; ascent: number }> = {};
  for (const base of BASE_FONTS) {
    ctx.font = `${PROBE_SIZE} ${base}`;
    const m = ctx.measureText(PROBE_TEXT);
    baseline[base] = {
      width: m.width,
      ascent: m.actualBoundingBoxAscent ?? 0,
    };
  }

  const detected: string[] = [];
  for (const font of FONTS_TO_PROBE) {
    let isAvailable = false;
    for (const base of BASE_FONTS) {
      ctx.font = `${PROBE_SIZE} "${font}", ${base}`;
      const m = ctx.measureText(PROBE_TEXT);
      const ascent = m.actualBoundingBoxAscent ?? 0;
      if (
        m.width !== baseline[base].width ||
        ascent !== baseline[base].ascent
      ) {
        isAvailable = true;
        break;
      }
    }
    if (isAvailable) detected.push(font);
  }

  return detected.sort();
}

function getScreenSignal(): string {
  if (typeof screen === "undefined") return "0x0x0";
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return `${screen.width}x${screen.height}x${screen.colorDepth}@${dpr}`;
}

function getUserAgent(): string {
  if (typeof navigator === "undefined") return "unknown";
  return navigator.userAgent || "unknown";
}

function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

async function sha256Hex(input: string): Promise<string> {
  if (
    typeof crypto !== "undefined" &&
    crypto.subtle &&
    typeof TextEncoder !== "undefined"
  ) {
    const bytes = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return fnv1aHex(input);
}

export interface DeviceFingerprintParts {
  userAgent: string;
  screen: string;
  fonts: string[];
}

export function collectFingerprintParts(): DeviceFingerprintParts {
  return {
    userAgent: getUserAgent(),
    screen: getScreenSignal(),
    fonts: detectFonts(),
  };
}

export async function generateDeviceFingerprint(): Promise<string> {
  const parts = collectFingerprintParts();
  const raw = [
    parts.userAgent,
    parts.screen,
    parts.fonts.join(","),
  ].join("|");
  return sha256Hex(raw);
}

export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") {
    return generateDeviceFingerprint();
  }
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return cached;
  } catch {
    // localStorage unavailable (e.g. private mode); fall through to compute.
  }
  const fingerprint = await generateDeviceFingerprint();
  try {
    localStorage.setItem(STORAGE_KEY, fingerprint);
  } catch {
    // ignore
  }
  return fingerprint;
}

export function clearDeviceFingerprint(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
