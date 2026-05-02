import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/context/UserContext";
import {
  createSavedLocation,
  deleteSavedLocation,
  fetchSavedLocations,
  updateSavedLocation,
  type SavedLocation,
  type SavedLocationKind,
} from "@/lib/api";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export type SavedLocationTarget = "pickup" | "dropoff";

export interface SavedLocationsProps {
  /**
   * Called when the rider taps a saved row.
   *  - If `target` prop is provided, this is called with that target.
   *  - If `target` is not provided, each row shows two buttons (Pick up / Drop off)
   *    and the chosen one is passed back as the second argument.
   */
  onSelect: (location: SavedLocation, target: SavedLocationTarget) => void;
  /** Lock all rows to a single target field (hides the dual buttons). */
  target?: SavedLocationTarget;
  /** Hide the inline add/edit form when the parent prefers to manage that elsewhere. */
  manageable?: boolean;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function SavedLocations({
  onSelect,
  target,
  manageable = true,
  className,
}: SavedLocationsProps) {
  const { deviceId } = useUser();

  const [items, setItems] = useState<SavedLocation[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SavedLocation | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Initial fetch (and refetch when device changes — should never in practice).
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setItems(null);
    fetchSavedLocations(deviceId)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Couldn't load saved places.",
        );
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  const usedKinds = useMemo<Set<SavedLocationKind>>(
    () => new Set((items ?? []).map((it) => it.kind)),
    [items],
  );

  /* ----- mutations ------------------------------------------------------- */
  const handleSaved = (saved: SavedLocation) => {
    setItems((prev) => {
      const next = (prev ?? []).filter((it) => it.id !== saved.id);
      next.push(saved);
      const order: Record<SavedLocationKind, number> = {
        home: 0,
        work: 1,
        other: 2,
      };
      return next.sort((a, b) => order[a.kind] - order[b.kind]);
    });
    setEditing(null);
    setAdding(false);
  };

  const handleDelete = async (loc: SavedLocation) => {
    setBusyId(loc.id);
    try {
      await deleteSavedLocation(loc.id);
      setItems((prev) => (prev ?? []).filter((it) => it.id !== loc.id));
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Couldn't delete that place.",
      );
    } finally {
      setBusyId(null);
    }
  };

  /* ----- render ---------------------------------------------------------- */

  return (
    <section
      className={`border-2 border-black bg-white ${className ?? ""}`}
      aria-label="Saved places"
    >
      <header className="flex items-center justify-between px-3 py-2 border-b-2 border-black bg-black text-white">
        <h2 className="text-xs font-bold uppercase tracking-widest text-yellow-400">
          Saved Places
        </h2>
        {manageable && !adding && !editing && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="px-2 py-1 bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-widest border-2 border-yellow-400 hover:bg-yellow-300"
          >
            + Add
          </button>
        )}
      </header>

      <div className="p-2 space-y-2">
        {items === null && (
          <p className="text-xs text-black/50 px-1 py-2">Loading…</p>
        )}

        {items !== null && items.length === 0 && !adding && !editing && (
          <EmptyState onAdd={manageable ? () => setAdding(true) : undefined} />
        )}

        {items?.map((loc) => (
          <SavedRow
            key={loc.id}
            loc={loc}
            target={target}
            disabled={busyId === loc.id}
            manageable={manageable}
            onPick={(t) => onSelect(loc, t)}
            onEdit={() => setEditing(loc)}
            onDelete={() => handleDelete(loc)}
          />
        ))}

        {(adding || editing) && (
          <SavedLocationForm
            initial={editing ?? undefined}
            usedKinds={usedKinds}
            userId={deviceId}
            onCancel={() => {
              setAdding(false);
              setEditing(null);
            }}
            onSaved={handleSaved}
          />
        )}

        {loadError && (
          <p
            role="alert"
            className="border-2 border-black bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-2 py-1"
          >
            {loadError}
          </p>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function EmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="px-1 py-3 text-center space-y-2">
      <p className="text-xs text-black/60">
        No saved places yet. Pin Home and Work for one-tap pickup.
      </p>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-1.5 bg-black text-white text-[11px] font-bold uppercase tracking-widest border-2 border-black hover:bg-yellow-400 hover:text-black"
        >
          + Add a place
        </button>
      )}
    </div>
  );
}

function SavedRow({
  loc,
  target,
  disabled,
  manageable,
  onPick,
  onEdit,
  onDelete,
}: {
  loc: SavedLocation;
  target?: SavedLocationTarget;
  disabled: boolean;
  manageable: boolean;
  onPick: (target: SavedLocationTarget) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`border-2 border-black bg-white flex flex-col ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <KindIcon kind={loc.kind} />

        {/* Tap-to-fill core (when target is fixed by the parent). */}
        {target ? (
          <button
            type="button"
            onClick={() => onPick(target)}
            disabled={disabled}
            className="flex-1 text-left min-w-0 active:translate-y-[1px] disabled:cursor-not-allowed"
            aria-label={`Use ${loc.label} as ${target}`}
          >
            <RowText loc={loc} />
          </button>
        ) : (
          <div className="flex-1 min-w-0">
            <RowText loc={loc} />
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-stretch border-t-2 border-black">
        {target ? (
          // Single-target mode: show a single full-width "Use" button + manage
          <>
            <button
              type="button"
              onClick={() => onPick(target)}
              disabled={disabled}
              className="flex-1 py-1.5 px-2 bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use as {target}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onPick("pickup")}
              disabled={disabled}
              className="flex-1 py-1.5 px-2 border-r-2 border-black bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pick up
            </button>
            <button
              type="button"
              onClick={() => onPick("dropoff")}
              disabled={disabled}
              className="flex-1 py-1.5 px-2 bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Drop off
            </button>
          </>
        )}

        {manageable && (
          <>
            <button
              type="button"
              onClick={onEdit}
              disabled={disabled}
              className="px-2 border-l-2 border-black bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Edit ${loc.label}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={disabled}
              className="px-2 border-l-2 border-black bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Delete ${loc.label}`}
            >
              ×
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RowText({ loc }: { loc: SavedLocation }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-bold text-black truncate uppercase tracking-wide">
        {loc.label}
      </p>
      <p className="text-[11px] text-black/70 truncate">{loc.address}</p>
    </div>
  );
}

function KindIcon({ kind }: { kind: SavedLocationKind }) {
  const styles = "w-8 h-8 border-2 border-black flex items-center justify-center shrink-0";
  if (kind === "home") {
    return (
      <span className={`${styles} bg-yellow-400 text-black`} aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M8 1l7 6h-2v8H10v-5H6v5H3V7H1z" />
        </svg>
      </span>
    );
  }
  if (kind === "work") {
    return (
      <span className={`${styles} bg-black text-yellow-400`} aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M5 3V1h6v2h4v12H1V3h4zm0 0h6V2H5v1z" />
        </svg>
      </span>
    );
  }
  return (
    <span className={`${styles} bg-white text-black`} aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
        <path d="M8 1a5 5 0 015 5c0 4-5 9-5 9S3 10 3 6a5 5 0 015-5zm0 3a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Add / edit form                                                            */
/* -------------------------------------------------------------------------- */

function SavedLocationForm({
  initial,
  usedKinds,
  userId,
  onCancel,
  onSaved,
}: {
  initial?: SavedLocation;
  usedKinds: Set<SavedLocationKind>;
  userId: string;
  onCancel: () => void;
  onSaved: (saved: SavedLocation) => void;
}) {
  const isEdit = Boolean(initial);
  const [kind, setKind] = useState<SavedLocationKind>(initial?.kind ?? "other");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill the label when picking Home/Work the first time so riders don't
  // have to type something obvious.
  const pickKind = (next: SavedLocationKind) => {
    setKind(next);
    if (!isEdit && (next === "home" || next === "work")) {
      const auto = next === "home" ? "Home" : "Work";
      if (label.trim().length === 0) setLabel(auto);
    }
  };

  const homeTaken = usedKinds.has("home") && initial?.kind !== "home";
  const workTaken = usedKinds.has("work") && initial?.kind !== "work";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedLabel = label.trim();
    const trimmedAddress = address.trim();
    if (trimmedLabel.length < 1) return setError("Add a label.");
    if (trimmedAddress.length < 3) return setError("Address is too short.");

    setBusy(true);
    try {
      const saved = isEdit
        ? await updateSavedLocation(initial!.id, {
            kind,
            label: trimmedLabel,
            address: trimmedAddress,
          })
        : await createSavedLocation({
            user_id: userId,
            kind,
            label: trimmedLabel,
            address: trimmedAddress,
          });
      onSaved(saved);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Couldn't save that place.";
      // Friendlier message for the unique-Home/Work constraint.
      if (/saved_locations_user_kind_unique/i.test(msg)) {
        setError(`You already have a ${kind} pinned. Edit that one instead.`);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="border-2 border-black bg-yellow-50 p-2 space-y-2"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">
        {isEdit ? "Edit place" : "New place"}
      </p>

      <div className="flex gap-1">
        <KindButton
          active={kind === "home"}
          disabled={homeTaken}
          onClick={() => pickKind("home")}
        >
          Home
        </KindButton>
        <KindButton
          active={kind === "work"}
          disabled={workTaken}
          onClick={() => pickKind("work")}
        >
          Work
        </KindButton>
        <KindButton active={kind === "other"} onClick={() => pickKind("other")}>
          Other
        </KindButton>
      </div>

      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={kind === "other" ? "Label (e.g. Mom's house)" : "Label"}
        maxLength={32}
        className="w-full px-2 py-1.5 border-2 border-black bg-white text-black text-xs focus:outline-none focus:bg-yellow-100"
      />

      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Address (e.g. Bab Touma, Damascus)"
        maxLength={120}
        className="w-full px-2 py-1.5 border-2 border-black bg-white text-black text-xs focus:outline-none focus:bg-yellow-100"
      />

      {error && (
        <p
          role="alert"
          className="border-2 border-black bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-2 py-1"
        >
          {error}
        </p>
      )}

      <div className="flex gap-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 py-1.5 px-2 border-2 border-black bg-white text-black text-[11px] font-bold uppercase tracking-wider hover:bg-yellow-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 py-1.5 px-2 bg-black text-white text-[11px] font-bold uppercase tracking-wider border-2 border-black hover:bg-yellow-400 hover:text-black disabled:opacity-50"
        >
          {busy ? "Saving…" : isEdit ? "Save changes" : "Save"}
        </button>
      </div>
    </form>
  );
}

function KindButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-widest border-2 border-black ${
        active ? "bg-black text-yellow-400" : "bg-white text-black"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-yellow-100"}`}
    >
      {children}
    </button>
  );
}
