import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
  type NotificationType,
} from "@/lib/api";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export interface NotificationCenterProps {
  /** Override the data source — useful for tests. */
  notifications?: NotificationRow[];
  /** Called when a row's `link` should be navigated to. */
  onNavigate?: (link: string) => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Self-contained bell + drawer                                               */
/* -------------------------------------------------------------------------- */

export default function NotificationCenter({
  notifications: external,
  onNavigate,
  className,
}: NotificationCenterProps) {
  const { deviceId } = useUser();
  const state = useNotificationFeed(deviceId, external);
  const [open, setOpen] = useState(false);

  return (
    <>
      <NotificationBell
        unreadCount={state.unreadCount}
        onClick={() => setOpen(true)}
        className={className}
      />
      <NotificationDrawer
        open={open}
        onClose={() => setOpen(false)}
        notifications={state.notifications}
        loading={state.loading}
        error={state.error}
        unreadCount={state.unreadCount}
        onMarkOneRead={state.markOneRead}
        onMarkAllRead={state.markAllRead}
        onNavigate={onNavigate}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Hook: useNotificationFeed                                                  */
/* -------------------------------------------------------------------------- */

interface FeedState {
  notifications: NotificationRow[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markOneRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

/**
 * Loads a user's notifications, keeps an unread count, and subscribes to
 * realtime INSERTs / UPDATEs so the badge ticks live.
 *
 * Pass `external` to bypass the network entirely (test / Storybook).
 */
function useNotificationFeed(
  userId: string,
  external?: NotificationRow[],
): FeedState {
  const [notifications, setNotifications] = useState<NotificationRow[]>(
    external ?? [],
  );
  const [loading, setLoading] = useState(!external);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch (skipped in external-data mode).
  useEffect(() => {
    if (external) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchNotifications(userId)
      .then((rows) => {
        if (cancelled) return;
        setNotifications(rows);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Couldn't load notifications.",
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, external]);

  // Realtime: prepend new rows on INSERT, patch existing on UPDATE
  // (typically a read_at change driven by another device).
  useEffect(() => {
    if (external || !userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: NotificationRow }) => {
          setNotifications((prev) => {
            // Guard against duplicates if the initial fetch raced ahead.
            if (prev.some((n) => n.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        },
      )
      .on(
        "postgres_changes" as never,
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: NotificationRow }) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n)),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, external]);

  // Derived — single source of truth for the badge.
  const unreadCount = useMemo(
    () => notifications.reduce((s, n) => s + (n.read_at ? 0 : 1), 0),
    [notifications],
  );

  // Optimistic mark-one — flip locally, then persist. The realtime UPDATE
  // event will reconcile any drift if the network response disagrees.
  const markOneRead = useCallback(
    async (id: string) => {
      const target = notifications.find((n) => n.id === id);
      if (!target || target.read_at) return;
      const stamp = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: stamp } : n)),
      );
      try {
        await markNotificationRead(id);
      } catch (err) {
        // Roll back if the server rejected it.
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: null } : n)),
        );
        setError(
          err instanceof Error ? err.message : "Couldn't mark that as read.",
        );
      }
    },
    [notifications],
  );

  // Optimistic mark-all — same pattern.
  const markAllRead = useCallback(async () => {
    const stamp = new Date().toISOString();
    const previous = notifications;
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: stamp })),
    );
    try {
      await markAllNotificationsRead(userId);
    } catch (err) {
      setNotifications(previous);
      setError(
        err instanceof Error ? err.message : "Couldn't mark all as read.",
      );
    }
  }, [userId, notifications]);

  // Hydrate count once on mount even if the rows query is slow — keeps the
  // badge accurate during the initial fetch latency window.
  useEffect(() => {
    if (external) return;
    let cancelled = false;
    fetchUnreadNotificationCount(userId)
      .then((n) => {
        if (cancelled) return;
        // Only seed if the rows fetch hasn't already populated state.
        setNotifications((prev) =>
          prev.length === 0 && n > 0
            ? // Insert lightweight placeholders so the badge shows the right
              // number while the full list loads. They'll get replaced when
              // fetchNotifications resolves.
              Array.from({ length: n }, (_, i) => ({
                id: `__placeholder_${i}`,
                user_id: userId,
                type: "system" as NotificationType,
                title: "",
                body: null,
                link: null,
                ride_id: null,
                read_at: null,
                created_at: new Date().toISOString(),
              }))
            : prev,
        );
      })
      .catch(() => {
        /* Silent — the rows fetch will error visibly if this also fails. */
      });
    return () => {
      cancelled = true;
    };
  }, [userId, external]);

  return {
    notifications: notifications.filter((n) => !n.id.startsWith("__placeholder")),
    unreadCount,
    loading,
    error,
    markOneRead,
    markAllRead,
  };
}

/* -------------------------------------------------------------------------- */
/* Bell button + unread badge                                                 */
/* -------------------------------------------------------------------------- */

export interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  className?: string;
}

export function NotificationBell({
  unreadCount,
  onClick,
  className,
}: NotificationBellProps) {
  const display = unreadCount > 9 ? "9+" : String(unreadCount);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        unreadCount > 0
          ? `Notifications (${unreadCount} unread)`
          : "Notifications"
      }
      className={`
        relative inline-flex items-center justify-center
        w-9 h-9 border-2 border-black bg-white text-black
        hover:bg-yellow-400 active:translate-y-[1px]
        ${className ?? ""}
      `}
    >
      <BellIcon ringing={unreadCount > 0} />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center bg-red-600 text-white text-[10px] font-bold tabular-nums border-2 border-black"
        >
          {display}
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide-out drawer                                                           */
/* -------------------------------------------------------------------------- */

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationRow[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  onMarkOneRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onNavigate?: (link: string) => void;
}

export function NotificationDrawer({
  open,
  onClose,
  notifications,
  loading,
  error,
  unreadCount,
  onMarkOneRead,
  onMarkAllRead,
  onNavigate,
}: NotificationDrawerProps) {
  // Esc-to-close. Only attached while the drawer is open so we don't leak a
  // global listener.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while the drawer is open so the page underneath
  // doesn't slide around when the user scrolls the feed on mobile.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const handleRowTap = async (n: NotificationRow) => {
    await onMarkOneRead(n.id);
    if (n.link) onNavigate?.(n.link);
  };

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black transition-opacity duration-200 ${
          open ? "opacity-50" : "opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className={`
          absolute top-0 right-0 h-full w-full sm:w-96
          bg-white border-l-2 border-black flex flex-col
          transition-transform duration-200 ease-out
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-2 px-3 py-2 border-b-2 border-black bg-black text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
              Inbox
            </p>
            <h2 className="text-base font-bold uppercase tracking-wider">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-red-600 text-white border-2 border-white tabular-nums">
                  {unreadCount}
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="w-8 h-8 inline-flex items-center justify-center border-2 border-yellow-400 bg-black text-yellow-400 hover:bg-yellow-400 hover:text-black"
          >
            ✕
          </button>
        </header>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b-2 border-black bg-gray-50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">
            {loading
              ? "Loading…"
              : notifications.length === 0
                ? "Empty"
                : `${notifications.length} total`}
          </p>
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
            className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border-2 border-black bg-white text-black hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mark all read
          </button>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <p
              role="alert"
              className="m-2 border-2 border-black bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-2 py-1"
            >
              {error}
            </p>
          )}

          {!loading && notifications.length === 0 && !error && (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center px-6 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-black/60">
                All caught up
              </p>
              <p className="mt-1 text-[11px] text-black/40">
                Bid updates, promos, and ride alerts will land here.
              </p>
            </div>
          )}

          <ul>
            {notifications.map((n) => (
              <NotificationRowItem
                key={n.id}
                notification={n}
                onTap={() => handleRowTap(n)}
              />
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Single notification row                                                    */
/* -------------------------------------------------------------------------- */

function NotificationRowItem({
  notification,
  onTap,
}: {
  notification: NotificationRow;
  onTap: () => void;
}) {
  const isUnread = !notification.read_at;
  const meta = TYPE_META[notification.type];

  return (
    <li className="border-b border-black/10">
      <button
        type="button"
        onClick={onTap}
        className={`
          w-full text-left px-3 py-2.5 flex gap-2
          hover:bg-yellow-50 active:bg-yellow-100
          ${isUnread ? "bg-white" : "bg-gray-50"}
        `}
      >
        {/* Type swatch */}
        <span
          aria-hidden="true"
          className={`mt-0.5 shrink-0 w-1.5 h-10 ${meta.swatch}`}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-black/50">
              {meta.label}
            </span>
            <span className="text-[10px] text-black/40 tabular-nums">
              {timeAgo(new Date(notification.created_at))}
            </span>
          </div>
          <p
            className={`text-sm leading-snug ${
              isUnread ? "font-bold text-black" : "font-normal text-black/70"
            }`}
          >
            {notification.title}
          </p>
          {notification.body && (
            <p className="text-[11px] text-black/60 leading-snug mt-0.5 line-clamp-2">
              {notification.body}
            </p>
          )}
        </div>

        {/* Unread dot */}
        {isUnread && (
          <span
            aria-label="Unread"
            className="mt-1 shrink-0 w-2 h-2 rounded-full bg-red-600"
          />
        )}
      </button>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Type metadata                                                              */
/* -------------------------------------------------------------------------- */

const TYPE_META: Record<NotificationType, { label: string; swatch: string }> = {
  bid_accepted: { label: "Bid accepted", swatch: "bg-green-600" },
  bid_received: { label: "New bid", swatch: "bg-yellow-400" },
  ride_update: { label: "Ride", swatch: "bg-blue-600" },
  promo: { label: "Promo", swatch: "bg-purple-600" },
  safety: { label: "Safety", swatch: "bg-red-600" },
  system: { label: "System", swatch: "bg-gray-400" },
};

/* -------------------------------------------------------------------------- */
/* Bell glyph                                                                 */
/* -------------------------------------------------------------------------- */

function BellIcon({ ringing }: { ringing: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
      className={ringing ? "animate-pulse" : ""}
    >
      <path d="M8 1a1 1 0 011 1v.6A4.5 4.5 0 0112.5 7v3l1 2H2.5l1-2V7A4.5 4.5 0 017 2.6V2a1 1 0 011-1zm-1.5 13a1.5 1.5 0 003 0h-3z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function timeAgo(d: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}
