type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function unlockAudio(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") {
    c.resume().catch(() => {});
  }
  unlocked = true;
}

if (typeof window !== "undefined") {
  const handler = () => {
    unlockAudio();
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
    window.removeEventListener("touchstart", handler);
  };
  window.addEventListener("pointerdown", handler, { once: true });
  window.addEventListener("keydown", handler, { once: true });
  window.addEventListener("touchstart", handler, { once: true });
}

interface ToneSpec {
  freq: number;
  startOffset: number;
  duration: number;
  type?: OscillatorType;
  peakGain?: number;
}

function playTones(tones: ToneSpec[]): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") {
    c.resume().catch(() => {});
    if (!unlocked) return;
  }

  const now = c.currentTime;

  for (const tone of tones) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.setValueAtTime(tone.freq, now + tone.startOffset);

    const peak = tone.peakGain ?? 0.18;
    gain.gain.setValueAtTime(0.0001, now + tone.startOffset);
    gain.gain.exponentialRampToValueAtTime(
      peak,
      now + tone.startOffset + 0.01,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + tone.startOffset + tone.duration,
    );

    osc.connect(gain).connect(c.destination);
    osc.start(now + tone.startOffset);
    osc.stop(now + tone.startOffset + tone.duration + 0.02);
  }
}

export function playNewBidSound(): void {
  playTones([
    { freq: 880, startOffset: 0, duration: 0.12, type: "sine" },
    { freq: 1320, startOffset: 0.08, duration: 0.14, type: "sine" },
  ]);
}

export function playAuctionSuccessSound(): void {
  playTones([
    { freq: 523.25, startOffset: 0.0, duration: 0.18, type: "triangle" },
    { freq: 659.25, startOffset: 0.14, duration: 0.18, type: "triangle" },
    { freq: 783.99, startOffset: 0.28, duration: 0.32, type: "triangle" },
  ]);
}
