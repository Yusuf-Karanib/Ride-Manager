import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/context/UserContext";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export interface InviteFriendsProps {
  /** Override the share URL host (mostly for tests). */
  shareOrigin?: string;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Code derivation                                                            */
/* -------------------------------------------------------------------------- */

// 30-char alphabet — no 0/O, no 1/I/L. Codes need to be readable aloud
// over a phone call and typeable without ambiguity.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const CODE_PREFIX = "FAST-";

/**
 * Deterministic per-device code via FNV-1a hash → base-30 reduction.
 * Stable across reloads so users can hand out the same code reliably,
 * no localStorage round-trip needed.
 *
 * NOT cryptographically unique — two different device IDs could collide
 * across the 30^6 ≈ 729M code space. For a mock, that's fine; for
 * production, swap for a server-issued code with uniqueness enforcement
 * (`insert ... on conflict do nothing returning code` against a unique
 * column).
 */
function deriveCode(deviceId: string): string {
  if (!deviceId) return "";
  let hash = 2166136261;
  for (let i = 0; i < deviceId.length; i++) {
    hash = ((hash ^ deviceId.charCodeAt(i)) * 16777619) >>> 0;
  }
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[hash % CODE_ALPHABET.length];
    hash = Math.floor(hash / CODE_ALPHABET.length);
    // Re-hash mid-stream so position N+1 doesn't trivially leak position N.
    hash = (hash * 16777619) >>> 0;
  }
  return `${CODE_PREFIX}${code}`;
}

/** Stable per-device code. Empty string until UserContext hydrates. */
export function useReferralCode(): string {
  const { deviceId } = useUser();
  return useMemo(() => deriveCode(deviceId), [deviceId]);
}

/* -------------------------------------------------------------------------- */
/* Share helpers                                                              */
/* -------------------------------------------------------------------------- */

function buildShareUrl(code: string, originOverride?: string): string {
  if (typeof window === "undefined") return "";
  const origin = originOverride ?? window.location.origin;
  const base = import.meta.env.BASE_URL; // already has trailing slash
  return `${origin}${base}?ref=${encodeURIComponent(code)}`;
}

function buildShareText(code: string, url: string): string {
  // SMS-friendly: short, valuable, links last so previews surface them.
  return `Join me on FAST24 — fair-priced rides across Damascus. Use code ${code} when you sign up. ${url}`;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

type FlashKind = "copied-code" | "copied-link" | "shared" | "error" | null;

export default function InviteFriends({
  shareOrigin,
  className,
}: InviteFriendsProps) {
  const code = useReferralCode();
  const shareUrl = useMemo(
    () => buildShareUrl(code, shareOrigin),
    [code, shareOrigin],
  );

  const [canShare, setCanShare] = useState(false);
  const [flash, setFlash] = useState<FlashKind>(null);

  // Feature-detect once on mount. SSR-safe; navigator only exists client-side.
  useEffect(() => {
    setCanShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  // Auto-dismiss the flash so it doesn't camp on screen forever.
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 2400);
    return () => window.clearTimeout(t);
  }, [flash]);

  const handleShare = async () => {
    if (!code) return;
    const text = buildShareText(code, shareUrl);

    if (canShare) {
      try {
        await navigator.share({
          title: "Try FAST24",
          text,
          url: shareUrl,
        });
        setFlash("shared");
      } catch (err) {
        // User-canceled share sheets throw AbortError. That's a normal user
        // action, not a failure — silence it.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Some browsers throw NotAllowedError if share isn't permitted in
        // the current context (e.g. cross-origin iframe). Fall through to
        // clipboard so the user always has a working path.
        await copyToClipboard(shareUrl, "copied-link");
      }
    } else {
      // No native share available — copy the link instead.
      await copyToClipboard(shareUrl, "copied-link");
    }
  };

  const handleCopyCode = () => copyToClipboard(code, "copied-code");
  const handleCopyLink = () => copyToClipboard(shareUrl, "copied-link");

  const copyToClipboard = async (value: string, flashKind: FlashKind) => {
    if (!value) return;
    try {
      // Modern path. Requires HTTPS (Replit serves HTTPS) + a user gesture
      // (which we always have since this fires from a click).
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setFlash(flashKind);
        return;
      }
      // execCommand path is deprecated but still works in legacy browsers
      // and some webview shells. Don't gate on its absence — try and let
      // the catch handler take over.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      document.execCommand("copy");
      document.body.removeChild(ta);
      setFlash(flashKind);
    } catch {
      setFlash("error");
    }
  };

  // Loading state — UserContext hasn't hydrated yet.
  if (!code) {
    return (
      <section
        className={`bg-white border-2 border-black p-4 ${className ?? ""}`}
        aria-label="Invite friends"
      >
        <p className="text-sm text-black/50">Loading your code…</p>
      </section>
    );
  }

  return (
    <section
      className={`bg-white border-2 border-black overflow-hidden ${className ?? ""}`}
      aria-label="Invite friends"
    >
      {/* Header — sulfur poster strip */}
      <header className="bg-yellow-400 text-black px-4 py-3 border-b-2 border-black">
        <p className="text-[10px] font-bold uppercase tracking-widest">
          FAST24
        </p>
        <h2 className="text-2xl font-bold uppercase tracking-wider mt-0.5">
          Invite Friends
        </h2>
        <p className="mt-1 text-xs leading-snug">
          Both you and your friend get a discount on your next ride when they
          sign up with your code.
        </p>
      </header>

      <div className="px-4 py-4">
        {/* Code display */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/60 mb-1">
          Your code
        </p>
        <button
          type="button"
          onClick={handleCopyCode}
          aria-label={`Copy referral code ${code}`}
          className="w-full px-3 py-3 border-2 border-black bg-[#0F172A] text-yellow-400 text-2xl font-bold tracking-[0.2em] tabular-nums text-center hover:bg-black active:translate-y-[1px] focus:outline-none focus:ring-0 focus:bg-black"
        >
          {code}
        </button>
        <p className="mt-1 text-[10px] text-black/50 text-center">
          Tap the code to copy
        </p>

        {/* Share URL preview — read-only, helps users see what gets shared */}
        <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-black/60 mb-1">
          Share link
        </p>
        <div className="flex items-stretch border-2 border-black bg-gray-50">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Share link"
            className="flex-1 min-w-0 px-2 py-1.5 bg-transparent text-[11px] font-mono text-black/70 truncate focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 border-l-2 border-black bg-white text-[10px] font-bold uppercase tracking-widest text-black hover:bg-yellow-400 active:translate-y-[1px]"
          >
            Copy
          </button>
        </div>

        {/* Primary share button */}
        <button
          type="button"
          onClick={handleShare}
          className="mt-4 w-full px-4 py-3 border-2 border-black bg-yellow-400 text-black text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-yellow-400 active:translate-y-[1px] inline-flex items-center justify-center gap-2"
        >
          <ShareIcon />
          {canShare ? "Share with a friend" : "Copy share link"}
        </button>
        {!canShare && (
          <p className="mt-1 text-[10px] text-black/50 text-center">
            Native share isn&rsquo;t available on this device — link copied
            instead.
          </p>
        )}

        {/* Flash messages */}
        {flash && (
          <p
            role="status"
            aria-live="polite"
            className={`mt-3 border-2 border-black text-[11px] font-bold uppercase tracking-widest px-2 py-1 text-center ${
              flash === "error"
                ? "bg-red-600 text-white"
                : "bg-green-600 text-white"
            }`}
          >
            {flash === "copied-code" && "Code copied"}
            {flash === "copied-link" && "Link copied"}
            {flash === "shared" && "Shared — thanks!"}
            {flash === "error" && "Couldn't copy — try again"}
          </p>
        )}

        {/* Future-state placeholder. Wire to a referrals table count when
            backend exists. Hidden by default to avoid faking stats. */}
        {/*
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="Invited" value={inviteCount} />
            <Stat label="Joined" value={joinedCount} />
          </div>
        */}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Glyph                                                                      */
/* -------------------------------------------------------------------------- */

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M11.5 1a2.5 2.5 0 00-2.45 3l-4.1 2.05a2.5 2.5 0 100 3.9l4.1 2.05A2.5 2.5 0 1010 10.45L5.9 8.4a2.5 2.5 0 000-.8L10 5.55A2.5 2.5 0 1011.5 1z" />
    </svg>
  );
}
