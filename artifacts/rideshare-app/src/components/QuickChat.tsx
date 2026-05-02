import { useEffect, useRef, useState } from "react";
import {
  QUICK_PHRASES,
  sendQuickChat,
  type ChatRole,
} from "@/lib/quickChatBus";

interface QuickChatProps {
  role: ChatRole;
  cooldownMs?: number;
}

const DEFAULT_COOLDOWN = 1500;
const SENT_FEEDBACK_MS = 1200;

export default function QuickChat({
  role,
  cooldownMs = DEFAULT_COOLDOWN,
}: QuickChatProps) {
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [cooldownActive, setCooldownActive] = useState(false);
  const cooldownTimerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current !== null) {
        window.clearTimeout(cooldownTimerRef.current);
      }
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const handleSend = (phrase: string) => {
    if (cooldownActive) return;

    sendQuickChat(role, phrase);
    setLastSent(phrase);
    setCooldownActive(true);

    if (cooldownTimerRef.current !== null) {
      window.clearTimeout(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = window.setTimeout(() => {
      setCooldownActive(false);
      cooldownTimerRef.current = null;
    }, cooldownMs);

    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setLastSent(null);
      feedbackTimerRef.current = null;
    }, SENT_FEEDBACK_MS);
  };

  return (
    <div className="border-2 border-black bg-white">
      <div className="px-3 py-2 border-b-2 border-black bg-black text-white text-xs font-bold uppercase tracking-wider flex items-center justify-between">
        <span>Quick Message</span>
        {lastSent && (
          <span className="text-yellow-400">✓ Sent</span>
        )}
      </div>

      <div className="p-2 grid grid-cols-1 gap-2">
        {QUICK_PHRASES.map((phrase) => {
          const isLast = lastSent === phrase;
          return (
            <button
              key={phrase}
              type="button"
              onClick={() => handleSend(phrase)}
              disabled={cooldownActive}
              aria-pressed={isLast}
              className={`w-full text-left px-3 py-2 border-2 border-black text-sm font-bold uppercase tracking-wide transition-colors ${
                isLast
                  ? "bg-yellow-400 text-black"
                  : "bg-white text-black hover:bg-yellow-100"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {phrase}
            </button>
          );
        })}
      </div>
    </div>
  );
}
