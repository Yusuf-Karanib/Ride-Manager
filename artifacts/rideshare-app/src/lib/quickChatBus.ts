export type ChatRole = "rider" | "driver";

export interface QuickChatMessage {
  id: string;
  from: ChatRole;
  text: string;
  sentAt: number;
}

type Listener = (msg: QuickChatMessage) => void;

const listeners = new Set<Listener>();

export const QUICK_PHRASES: readonly string[] = [
  "I am here",
  "I'm in front of the landmark",
  "I'll be there in 5 mins",
  "Please wait for me",
];

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `qc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sendQuickChat(from: ChatRole, text: string): QuickChatMessage {
  const msg: QuickChatMessage = {
    id: makeId(),
    from,
    text,
    sentAt: Date.now(),
  };
  for (const l of listeners) {
    try {
      l(msg);
    } catch (err) {
      console.error("[quickChatBus] listener error", err);
    }
  }
  return msg;
}

export function subscribeQuickChat(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
