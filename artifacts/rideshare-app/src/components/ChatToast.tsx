import { useEffect, useRef, useState } from "react";
import {
  subscribeQuickChat,
  type ChatRole,
  type QuickChatMessage,
} from "@/lib/quickChatBus";

interface ChatToastProps {
  audience: ChatRole;
  durationMs?: number;
}

const DEFAULT_DURATION = 4000;

export default function ChatToast({
  audience,
  durationMs = DEFAULT_DURATION,
}: ChatToastProps) {
  const [message, setMessage] = useState<QuickChatMessage | null>(null);
  const dismissTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeQuickChat((msg) => {
      if (msg.from === audience) return;
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
      }
      setMessage(msg);
      dismissTimerRef.current = window.setTimeout(() => {
        setMessage(null);
        dismissTimerRef.current = null;
      }, durationMs);
    });

    return () => {
      unsubscribe();
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [audience, durationMs]);

  if (!message) return null;

  const senderLabel = message.from === "rider" ? "Rider" : "Driver";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[2400] w-[min(92vw,420px)]"
    >
      <div className="border-2 border-black bg-yellow-400 text-black shadow-[4px_4px_0_0_#000]">
        <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider border-b-2 border-black flex items-center justify-between">
          <span>{senderLabel}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label="Dismiss message"
            className="text-black/80 hover:text-black text-base leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-3 py-2 text-sm font-medium">{message.text}</div>
      </div>
    </div>
  );
}
