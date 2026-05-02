import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/context/UserContext";
import {
  closeSupportTicket,
  createSupportTicket,
  fetchMySupportTickets,
  type SupportCategory,
  type SupportStatus,
  type SupportTicket,
} from "@/lib/api";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const DESCRIPTION_MAX = 1000;
const SUBJECT_MAX = 80;

interface CategoryConfig {
  value: SupportCategory;
  label: string;
  hint: string;
}

const CATEGORIES: readonly CategoryConfig[] = [
  {
    value: "payment",
    label: "Payment / Cash dispute",
    hint: "The fare paid didn't match what you agreed on.",
  },
  {
    value: "driver_behavior",
    label: "Driver behavior",
    hint: "The driver was rude, took a wrong route, or you felt unsafe.",
  },
  {
    value: "rider_behavior",
    label: "Rider behavior",
    hint: "Driver-side report about a passenger.",
  },
  {
    value: "lost_item",
    label: "Lost item",
    hint: "You left something in the car.",
  },
  {
    value: "app_bug",
    label: "App bug",
    hint: "Something didn't work right — crashes, missing buttons, etc.",
  },
  {
    value: "account",
    label: "Account / Login",
    hint: "Trouble signing in, banned by mistake, or wrong info on file.",
  },
  {
    value: "safety",
    label: "Safety concern",
    hint: "Non-emergency safety report. For emergencies, call 112.",
  },
  {
    value: "other",
    label: "Other",
    hint: "Doesn't fit the categories above.",
  },
];

const STATUS_STYLE: Record<SupportStatus, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-yellow-400 text-black" },
  in_progress: { label: "In progress", cls: "bg-blue-600 text-white" },
  resolved: { label: "Resolved", cls: "bg-green-600 text-white" },
  closed: { label: "Closed", cls: "bg-gray-300 text-black" },
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export interface HelpCenterProps {
  /** Pre-fill the ride id field (e.g. opened from inside an active ride). */
  initialRideId?: string;
  /** Whether to display the user's previous tickets below the form. */
  showHistory?: boolean;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; ticketId: string }
  | { kind: "error"; message: string };

export default function HelpCenter({
  initialRideId,
  showHistory = true,
  className,
}: HelpCenterProps) {
  const { deviceId, userType } = useUser();
  const role: "rider" | "driver" = userType === "driver" ? "driver" : "rider";

  const [category, setCategory] = useState<SupportCategory | "">("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [rideId, setRideId] = useState(initialRideId ?? "");
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

  // History
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!showHistory) return;
    let cancelled = false;
    setTickets(null);
    setHistoryError(null);
    fetchMySupportTickets(deviceId)
      .then((rows) => !cancelled && setTickets(rows))
      .catch((err: unknown) => {
        if (cancelled) return;
        setHistoryError(
          err instanceof Error ? err.message : "Couldn't load your tickets.",
        );
        setTickets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [deviceId, showHistory, submit.kind]);

  const activeCategory = useMemo(
    () => CATEGORIES.find((c) => c.value === category),
    [category],
  );

  const validationError = useMemo(() => {
    if (!category) return "Pick a category.";
    if (subject.trim().length < 4) return "Add a short subject (4+ chars).";
    if (description.trim().length < 10)
      return "Describe the issue in a bit more detail (10+ chars).";
    return null;
  }, [category, subject, description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) return;
    setSubmit({ kind: "sending" });
    try {
      const ticket = await createSupportTicket({
        user_id: deviceId,
        role,
        ride_id: rideId.trim() || null,
        category: category as SupportCategory,
        subject: subject.trim(),
        description: description.trim(),
      });
      setSubmit({ kind: "sent", ticketId: ticket.id });
      // Reset the form for the next submission.
      setCategory("");
      setSubject("");
      setDescription("");
      setRideId(initialRideId ?? "");
    } catch (err) {
      setSubmit({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Couldn't submit your ticket.",
      });
    }
  };

  const handleClose = async (id: string) => {
    try {
      const updated = await closeSupportTicket(id);
      setTickets((prev) =>
        (prev ?? []).map((t) => (t.id === id ? updated : t)),
      );
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : "Couldn't close that ticket.",
      );
    }
  };

  const sending = submit.kind === "sending";

  return (
    <div className={`min-h-screen bg-white text-black ${className ?? ""}`}>
      <header className="bg-black text-white px-4 py-3 border-b-2 border-black">
        <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
          Support
        </p>
        <h1 className="text-base font-bold uppercase tracking-wider">
          Help Center
        </h1>
      </header>

      <div className="max-w-md mx-auto px-4 py-4 space-y-5">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Section title="What's the issue?">
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as SupportCategory | "")
              }
              className="w-full px-2 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none focus:bg-yellow-50"
            >
              <option value="">Choose a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {activeCategory && (
              <p className="mt-1 text-[11px] text-black/60">
                {activeCategory.hint}
              </p>
            )}
          </Section>

          {category === "safety" && (
            <div
              role="alert"
              className="border-2 border-black bg-red-600 text-white px-3 py-2 text-[11px] leading-tight"
            >
              <p className="font-bold uppercase tracking-wider mb-0.5">
                In immediate danger?
              </p>
              <p>
                Call 112 (police / emergency) right now. This form is for
                non-emergency reports we'll review within 24 hours.
              </p>
            </div>
          )}

          <Section title="Ride ID (optional)">
            <input
              type="text"
              value={rideId}
              onChange={(e) => setRideId(e.target.value)}
              placeholder="Paste a ride ID if this is about a specific trip"
              className="w-full px-2 py-2 border-2 border-black bg-white text-black text-xs font-mono focus:outline-none focus:bg-yellow-50"
            />
          </Section>

          <Section title="Subject">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_MAX))}
              placeholder="One-line summary"
              maxLength={SUBJECT_MAX}
              className="w-full px-2 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none focus:bg-yellow-50"
            />
            <CharCount value={subject.length} max={SUBJECT_MAX} />
          </Section>

          <Section title="Describe what happened">
            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, DESCRIPTION_MAX))
              }
              placeholder="Be specific. Include times, places, and what you'd like us to do."
              rows={5}
              maxLength={DESCRIPTION_MAX}
              className="w-full px-2 py-2 border-2 border-black bg-white text-black text-sm leading-snug focus:outline-none focus:bg-yellow-50 resize-y"
            />
            <CharCount value={description.length} max={DESCRIPTION_MAX} />
          </Section>

          {submit.kind === "sent" && (
            <div className="border-2 border-black bg-green-600 text-white px-3 py-2 text-[11px]">
              <p className="font-bold uppercase tracking-wider">
                Ticket submitted
              </p>
              <p className="font-mono mt-0.5 break-all">#{submit.ticketId}</p>
              <p className="mt-1 opacity-90">
                We'll review it within 24 hours.
              </p>
            </div>
          )}

          {submit.kind === "error" && (
            <p
              role="alert"
              className="border-2 border-black bg-red-600 text-white px-3 py-2 text-[11px] font-bold uppercase tracking-wider"
            >
              {submit.message}
            </p>
          )}

          {validationError && submit.kind !== "sent" && (subject.length > 0 || description.length > 0 || category !== "") && (
            <p className="text-[11px] text-black/60">{validationError}</p>
          )}

          <button
            type="submit"
            disabled={sending || Boolean(validationError)}
            className="w-full py-3 px-3 bg-black text-white text-sm font-bold uppercase tracking-wider border-2 border-black hover:bg-yellow-400 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Submitting…" : "Submit Ticket"}
          </button>
        </form>

        {/* History */}
        {showHistory && (
          <section className="border-t-2 border-black pt-4 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-black">
              Your previous tickets
            </h2>

            {tickets === null && (
              <p className="text-xs text-black/50">Loading…</p>
            )}

            {tickets !== null && tickets.length === 0 && (
              <p className="text-xs text-black/50">
                No tickets yet. Anything you submit will appear here.
              </p>
            )}

            {tickets?.map((t) => (
              <TicketRow key={t.id} ticket={t} onClose={handleClose} />
            ))}

            {historyError && (
              <p
                role="alert"
                className="border-2 border-black bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-2 py-1"
              >
                {historyError}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-black/60 mb-1">
        {title}
      </span>
      {children}
    </label>
  );
}

function CharCount({ value, max }: { value: number; max: number }) {
  const near = value / max > 0.9;
  return (
    <p
      className={`mt-0.5 text-right text-[10px] tabular-nums ${
        near ? "text-red-600 font-bold" : "text-black/50"
      }`}
    >
      {value} / {max}
    </p>
  );
}

function TicketRow({
  ticket,
  onClose,
}: {
  ticket: SupportTicket;
  onClose: (id: string) => void;
}) {
  const status = STATUS_STYLE[ticket.status];
  const cat = CATEGORIES.find((c) => c.value === ticket.category);
  const closable = ticket.status === "open" || ticket.status === "in_progress";
  return (
    <article className="border-2 border-black bg-white">
      <header className="flex items-center justify-between gap-2 px-2 py-1.5 border-b-2 border-black bg-gray-50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-black/70 truncate">
          {cat?.label ?? ticket.category}
        </span>
        <span
          className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border-2 border-black ${status.cls}`}
        >
          {status.label}
        </span>
      </header>
      <div className="px-2 py-2 space-y-1">
        <p className="text-sm font-bold text-black">{ticket.subject}</p>
        <p className="text-[11px] text-black/70 leading-tight whitespace-pre-wrap">
          {ticket.description}
        </p>
        {ticket.admin_notes && (
          <div className="mt-1 border-l-4 border-yellow-400 bg-yellow-50 px-2 py-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-black/60">
              Reply from support
            </p>
            <p className="text-[11px] text-black whitespace-pre-wrap">
              {ticket.admin_notes}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-black/40 font-mono">
            #{ticket.id.slice(0, 8)} · {new Date(ticket.created_at).toLocaleDateString()}
          </p>
          {closable && (
            <button
              type="button"
              onClick={() => onClose(ticket.id)}
              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border-2 border-black bg-white text-black hover:bg-yellow-100"
            >
              Mark closed
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
