import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export type NotificationKind =
  | "bid_accepted"
  | "bid_rejected"
  | "bid_received"
  | "ride_arriving"
  | "ride_completed"
  | "promo"
  | "referral_joined"
  | "system";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  /** Headline shown in the row. */
  title: string;
  /** Optional secondary line. */
  body?: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp when the user marked it read. Null = unread. */
  readAt: string | null;
  /** Optional in-app destination (route or deep link). Caller resolves it. */
  href?: string;
  /** Optional structured payload — bid id, promo code, etc. */
  meta?: Record<string, string | number | boolean | null>;
}

export interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  /** External notifications source. If omitted, the local mock is used. */
  notifications?: AppNotification[];
  /** Override for navigation when a notification with `href` is tapped. */
  onNavigate?: (href: string, n: AppNotification) => void;
  className?: string;
}

export interface NotificationBellProps {
  onClick: () => void;
  /** Override unread count. If omitted, reads from the local mock. */
  unreadCount?: number;
  className?: string;
  ariaLabel?: string;
}

/* -------------------------------------------------------------------------- */
/* Mock storage                                                               */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "fast24_notifications_v1";
const STORAGE_EVENT = "fast24:notifications";

function readStored(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedNotifications();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is AppNotification =>
        typeof n === "object" &&
        n !== null &&
        typeof (n as AppNotification).id === "string" &&
        typeof (n as AppNotification).kind === "string" &&
        typeof (n as AppNotification).title === "string" &&
        typeof (n as AppNotification).createdAt === "string",
    );
  } catch {
    return [];
  }
}

function writeStored(items: AppNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
  } catch {
    /* best-effort */
  }
}

/** Append a notification. Newest-first ordering. Caps storage at 100. */
export function notifyUser(
  partial: Omit<AppNotification, "id" | "createdAt" | "readAt"> &
    Partial<Pick<AppNotification, "id" | "createdAt" | "readAt">>,
): AppNotification {
  const n: AppNotification = {
    id: partial.id ?? `ntf_${crypto.randomUUID()}`,
    createdAt: partial.createdAt ?? new Date().toISOString(),
    readAt: partial.readAt ?? null,
    kind: partial.kind,
    title: partial.title,
    body: partial.body,
    href: partial.href,
    meta: partial.meta,
  };
  const next = [n, ...readStored()].slice(0, 100);
  writeStored(next);
  return n;
}

export function markNotificationRead(id: string): void {
  const now = new Date().toISOString();
  writeStored(
    readStored().map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n)),
  );
}

export function markAllNotificationsRead(): void {
  const now = new Date().toISOString();
  writeStored(readStored().map((n) => (n.readAt ? n : { ...n, readAt: now })));
}

export function clearAllNotifications(): void {
  writeStored([]);
}

/** Subscribes to the local mock notifications list. */
export function useNotifications(): AppNotification[] {
  const [list, setList] = useState<AppNotification[]>(() => readStored());
  useEffect(() => {
    const refresh = () => setList(readStored());
    window.addEventListener(STORAGE_EVENT, refresh);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(STORAGE_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return list;
}

/** Convenience: derived unread count, kept in sync with the list. */
export function useUnreadCount(): number {
  const list = useNotifications();
  return useMemo(() => list.filter((n) => !n.readAt).length, [list]);
}

function seedNotifications(): AppNotification[] {
  const now = Date.now();
  const min = 60_000;
  const hr = 3_600_000;
  const seed: AppNotification[] = [
    {
      id: "ntf_seed_1",
      kind: "bid_accepted",
      title: "Driver accepted your bid",
      body: "Yusuf is on the way · 4 min ETA",
      createdAt: new Date(now - 3 * min).toISOString(),
      readAt: null,
      href: "/ride/active",
    },
    {
      id: "ntf_seed_2",
      kind: "promo",
      title: "New promo code available",
      body: "Use FRIDAY20 for 20% off your next ride",
      createdAt: new Date(now - 45 * min).toISOString(),
      readAt: null,
      meta: { code: "FRIDAY20" },
    },
    {
      id: "ntf_seed_3",
      kind: "bid_rejected",
      title: "Bid not accepted",
      body: "No drivers took your offer of 7,000 SYP",
      createdAt: new Date(now - 2 * hr).toISOString(),
      readAt: null,
    },
    {
      id: "ntf_seed_4",
      kind: "system",
      title: "Welcome to FAST24",
      body: "Cash-only, zero commission. Tap to learn how it works.",
      createdAt: new Date(now - 26 * hr).toISOString(),
      readAt: new Date(now - 25 * hr).toISOString(),
    },
  ];
  writeStored(seed);
  return seed;
}

/* -------------------------------------------------------------------------- */
/* Per-kind metadata                                                          */
/* -------------------------------------------------------------------------- */

const KIND_META: Record<
  NotificationKind,
  { glyph: string; tone: "good" | "bad" | "info" | "promo" }
> = {
  bid_accepted: { glyph: "✓", tone: "good" },
  bid_rejected: { glyph: "×", tone: "bad" },
  bid_received: { glyph: "↓", tone: "info" },
  ride_arriving: { glyph: "→", tone: "info" },
  ride_completed: { glyph: "✓", tone: "good" },
  promo: { glyph: "%", tone: "promo" },
  referral_joined: { glyph: "+", tone: "good" },
  system: { glyph: "i", tone: "info" },
};

const TONE_STYLES: Record<
  "good" | "bad" | "info" | "promo",
  { bg: string; fg: string }
> = {
  good: { bg: "bg-green-600", fg: "text-white" },
  bad: { bg: "bg-red-600", fg: "text-white" },
  info: { bg: "bg-gray-800", fg: "text-white" },
  promo: { bg: "bg-yellow-400", fg: "text-black" },
};

/* -------------------------------------------------------------------------- */
/* Time helper                                                                */
/* -------------------------------------------------------------------------- */

const REL = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relTime(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diffSec = Math.round((t - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return "just now";
  if (abs < 3600) return REL.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return REL.format(Math.round(diffSec / 3600), "hour");
  if (abs < 604800) return REL.format(Math.round(diffSec / 86400), "day");
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/* NotificationBell — nav-bar trigger with unread badge                       */
/* -------------------------------------------------------------------------- */

export function NotificationBell({
  onClick,
  unreadCount,
  className,
  ariaLabel,
}: NotificationBellProps) {
  const fallbackCount = useUnreadCount();
  const count = unreadCount ?? fallbackCount;
  const display = count > 9 ? "9+" : String(count);
  const label =
    ariaLabel ??
    (count > 0
      ? `Notifications, ${count} unread`
      : "Notifications");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative inline-flex items-center justify-center w-10 h-10 border-2 border-black bg-white text-black hover:bg-yellow-400 active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
        className ?? ""
      }`}
    >
      <BellIcon />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-red-600 border-2 border-white text-white text-[10px] font-bold leading-none tabular-nums"
        >
          {display}
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* NotificationCenter — slide-in drawer                                       */
/* -------------------------------------------------------------------------- */

export default function NotificationCenter({
  open,
  onClose,
  notifications,
  onNavigate,
  className,
}: NotificationCenterProps) {
  const fallback = useNotifications();
  const source = notifications ?? fallback;

  const items = useMemo(
    () =>
      [...source].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [source],
  );

  const unreadCount = items.filter((n) => !n.readAt).length;

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Body scroll lock while open. Saves and restores the previous overflow
  // value so we don't stomp on app-level styles set elsewhere.
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Move focus to the close button when the drawer opens. Crude but
  // sufficient — full focus-trap libraries are overkill here.
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!open) return undefined;
    // Wait one frame so the element is mounted before focusing.
    const id = window.requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  // Re-render every minute so relative times age. Cheap (handful of nodes).
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, [open]);

  const handleItemClick = useCallback(
    (n: AppNotification) => {
      if (!n.readAt && !notifications) {
        // Only mutate the local store when we own the data.
        markNotificationRead(n.id);
      }
      if (n.href) {
        if (onNavigate) onNavigate(n.href, n);
        // No internal router fallback — caller decides routing strategy
        // (react-router navigate, wouter setLocation, window.location, etc).
      }
    },
    [notifications, onNavigate],
  );

  const handleMarkAll = useCallback(() => {
    if (notifications) return; // controlled mode — caller owns the data
    markAllNotificationsRead();
  }, [notifications]);

  return (
    <>
      {/* Backdrop. `pointer-events-none` when closed prevents accidental
          clicks during the fade-out transition. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer. We always render it (just translated off-screen when closed)
          so the slide animation works in both directions. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        aria-hidden={!open}
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] bg-white border-l-2 border-black shadow-2xl transition-transform duration-300 flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        } ${className ?? ""}`}
      >
        {/* Header */}
        <header className="bg-black text-white px-4 py-3 border-b-2 border-black flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
              FAST24
            </p>
            <h2 className="text-2xl font-bold uppercase tracking-wider mt-0.5">
              Notifications
            </h2>
            <p className="text-[11px] text-white/60 mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : "You're all caught up"}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="w-9 h-9 inline-flex items-center justify-center border-2 border-yellow-400 bg-transparent text-yellow-400 hover:bg-yellow-400 hover:text-black active:translate-y-[1px] focus:outline-none"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Action row */}
        <div className="px-4 py-2 border-b-2 border-black bg-gray-50 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">
            {items.length} total
          </p>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={unreadCount === 0 || !!notifications}
            className="px-2 py-1 border-2 border-black bg-white text-[10px] font-bold uppercase tracking-widest text-black enabled:hover:bg-yellow-400 active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mark all as read
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-black/60">
                Nothing new
              </p>
              <p className="mt-1 text-[11px] text-black/50">
                Bids, ride updates, and promos will show up here.
              </p>
            </div>
          ) : (
            <ul>
              {items.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onClick={() => handleItemClick(n)}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Row                                                                        */
/* -------------------------------------------------------------------------- */

interface RowProps {
  notification: AppNotification;
  onClick: () => void;
}

function NotificationRow({ notification: n, onClick }: RowProps) {
  const meta = KIND_META[n.kind] ?? KIND_META.system;
  const tone = TONE_STYLES[meta.tone];
  const isUnread = !n.readAt;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-4 py-3 border-b border-black/10 flex items-start gap-3 hover:bg-yellow-400/10 active:bg-yellow-400/20 focus:outline-none focus:bg-yellow-400/20 ${
          isUnread ? "bg-yellow-400/5" : ""
        }`}
      >
        {/* Tone swatch */}
        <span
          aria-hidden="true"
          className={`flex-none w-8 h-8 inline-flex items-center justify-center border-2 border-black text-sm font-bold ${tone.bg} ${tone.fg}`}
        >
          {meta.glyph}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[13px] font-bold text-black truncate">
              {n.title}
            </p>
            <time
              dateTime={n.createdAt}
              className="text-[10px] text-black/50 whitespace-nowrap"
            >
              {relTime(n.createdAt)}
            </time>
          </div>
          {n.body && (
            <p className="mt-0.5 text-[12px] text-black/70 leading-snug line-clamp-2">
              {n.body}
            </p>
          )}
        </div>

        {/* Unread dot */}
        {isUnread && (
          <span
            aria-label="Unread"
            className="flex-none w-2 h-2 mt-2 rounded-full bg-red-600"
          />
        )}
      </button>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Glyphs                                                                     */
/* -------------------------------------------------------------------------- */

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" />
      <path d="M10 20a2 2 0 004 0" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}
