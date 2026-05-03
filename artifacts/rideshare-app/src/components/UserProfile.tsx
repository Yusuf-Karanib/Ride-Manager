import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useUser, type UserProfile as UserProfileShape } from "@/context/UserContext";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export interface UserProfileProps {
  /** Optional callback fired after a successful save. */
  onSaved?: (profile: UserProfileShape) => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

interface FieldErrors {
  name?: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

const NAME_MIN = 2;
const NAME_MAX = 60;
// Lenient phone — accepts +963 9XX XXX XXX, 09XX XXX XXX, etc. Requires
// at least 9 digits among allowed chars. Strict national-format checks
// would lock out legitimate users entering numbers in the format their
// SIM provider taught them.
const PHONE_ALLOWED = /^[+()\-\s0-9]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: { name: string; phone: string; email: string }): FieldErrors {
  const errs: FieldErrors = {};

  const name = form.name.trim();
  if (!name) errs.name = "Name is required.";
  else if (name.length < NAME_MIN) errs.name = `At least ${NAME_MIN} characters.`;
  else if (name.length > NAME_MAX) errs.name = `Up to ${NAME_MAX} characters.`;

  const phone = form.phone.trim();
  if (!phone) errs.phone = "Phone is required.";
  else if (!PHONE_ALLOWED.test(phone))
    errs.phone = "Use digits, spaces, + or - only.";
  else if (phone.replace(/\D/g, "").length < 9)
    errs.phone = "Enter a complete number.";

  const email = form.email.trim();
  if (email && !EMAIL_REGEX.test(email)) errs.email = "Enter a valid email.";

  return errs;
}

/* -------------------------------------------------------------------------- */
/* Image helpers                                                              */
/* -------------------------------------------------------------------------- */

const MAX_AVATAR_DIM = 256; // px on the longest edge
const AVATAR_QUALITY = 0.85;
const RAW_MAX_BYTES = 10 * 1024 * 1024; // 10 MB pre-downscale guard

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't decode image."));
    img.src = src;
  });
}

function fitWithin(w: number, h: number, max: number): { w: number; h: number } {
  if (w <= max && h <= max) return { w, h };
  const ratio = w > h ? max / w : max / h;
  return { w: Math.round(w * ratio), h: Math.round(h * ratio) };
}

/**
 * Resize a user-selected image down to a localStorage-safe size and return
 * a JPEG data URL. JPEG (not PNG) because PNG with alpha can balloon to
 * many MB even at 256×256, and avatars don't need transparency.
 */
async function downscaleAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Pick an image file.");
  }
  if (file.size > RAW_MAX_BYTES) {
    throw new Error("Image is too large (max 10 MB).");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { w, h } = fitWithin(img.naturalWidth, img.naturalHeight, MAX_AVATAR_DIM);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image processing isn't supported here.");
    // White background avoids the canvas exporting a transparent JPEG
    // (which becomes solid black in some renderers).
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", AVATAR_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]![0] ?? "") + (parts[parts.length - 1]![0] ?? ""))
    .toUpperCase();
}

function isDirty(
  form: { name: string; phone: string; email: string; avatarDataUrl: string | null },
  saved: UserProfileShape,
): boolean {
  return (
    form.name !== saved.name ||
    form.phone !== saved.phone ||
    form.email !== saved.email ||
    form.avatarDataUrl !== saved.avatarDataUrl
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

export default function UserProfile({ onSaved, className }: UserProfileProps) {
  const { profile, saveProfile } = useUser();

  // Local form state — separate from context so unsaved edits don't leak
  // out before submit. Initialized from context, re-synced when context
  // changes from elsewhere (e.g. another tab).
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(
    profile.avatarDataUrl,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [avatarBusy, setAvatarBusy] = useState(false);

  // Re-sync local form when context profile changes from outside (cross-tab,
  // logout/login). Skip while the user has unsaved edits — would be surprising
  // to lose them mid-edit. We detect that via dirty check against the
  // *previous* context profile snapshot.
  const lastSyncedRef = useRef<UserProfileShape>(profile);
  useEffect(() => {
    const dirty = isDirty(
      { name, phone, email, avatarDataUrl },
      lastSyncedRef.current,
    );
    if (!dirty) {
      setName(profile.name);
      setPhone(profile.phone);
      setEmail(profile.email);
      setAvatarDataUrl(profile.avatarDataUrl);
    }
    lastSyncedRef.current = profile;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.name, profile.phone, profile.email, profile.avatarDataUrl]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const dirty = useMemo(
    () => isDirty({ name, phone, email, avatarDataUrl }, profile),
    [name, phone, email, avatarDataUrl, profile],
  );

  const handleAvatarPick = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset the input value so the same file can be re-picked after a
      // failed attempt — browsers debounce identical selections otherwise.
      e.target.value = "";
      if (!file) return;
      setAvatarBusy(true);
      setErrors((prev) => ({ ...prev, avatar: undefined }));
      try {
        const dataUrl = await downscaleAvatar(file);
        setAvatarDataUrl(dataUrl);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Couldn't load that image.";
        setErrors((prev) => ({ ...prev, avatar: message }));
      } finally {
        setAvatarBusy(false);
      }
    },
    [],
  );

  const handleRemoveAvatar = useCallback(() => {
    setAvatarDataUrl(null);
    setErrors((prev) => ({ ...prev, avatar: undefined }));
  }, []);

  const handleDiscard = useCallback(() => {
    setName(profile.name);
    setPhone(profile.phone);
    setEmail(profile.email);
    setAvatarDataUrl(profile.avatarDataUrl);
    setErrors({});
    setStatus({ kind: "idle" });
  }, [profile]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fieldErrors = validate({ name, phone, email });
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      if (Object.keys(fieldErrors).length > 0) {
        setStatus({
          kind: "error",
          message: "Fix the highlighted fields and try again.",
        });
        return;
      }
      setStatus({ kind: "saving" });
      try {
        const next = await saveProfile({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          avatarDataUrl,
        });
        setStatus({ kind: "saved", at: Date.now() });
        onSaved?.(next);
      } catch (err) {
        setStatus({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : "Couldn't save your profile. Try again.",
        });
      }
    },
    [name, phone, email, avatarDataUrl, saveProfile, onSaved],
  );

  // Auto-clear the "Saved" toast after 3 seconds so it doesn't camp.
  useEffect(() => {
    if (status.kind !== "saved") return;
    const id = window.setTimeout(() => setStatus({ kind: "idle" }), 3000);
    return () => window.clearTimeout(id);
  }, [status]);

  const saving = status.kind === "saving";
  const canSubmit = dirty && !saving && !avatarBusy;

  return (
    <section
      className={`bg-white border-2 border-black overflow-hidden ${className ?? ""}`}
      aria-label="Profile settings"
    >
      {/* Header */}
      <header className="bg-black text-white px-4 py-3 border-b-2 border-black">
        <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
          FAST24
        </p>
        <h2 className="text-2xl font-bold uppercase tracking-wider mt-0.5">
          Your Profile
        </h2>
        {profile.updatedAt && (
          <p className="text-[11px] text-white/60 mt-0.5">
            Last updated {new Date(profile.updatedAt).toLocaleString()}
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} noValidate>
        {/* Avatar */}
        <div className="px-4 py-4 border-b-2 border-black flex items-center gap-4">
          <div className="relative">
            <div
              className={`w-20 h-20 rounded-full border-2 border-black overflow-hidden flex items-center justify-center ${
                avatarDataUrl ? "" : "bg-[#0F172A] text-yellow-400"
              }`}
              aria-label={
                avatarDataUrl
                  ? `Avatar preview for ${name || "you"}`
                  : "No avatar set"
              }
            >
              {avatarDataUrl ? (
                <img
                  src={avatarDataUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <span className="text-2xl font-bold tracking-widest tabular-nums">
                  {initialsFrom(name)}
                </span>
              )}
            </div>
            {avatarBusy && (
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-yellow-400 text-[9px] font-bold uppercase tracking-widest"
              >
                Resizing
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">
              Avatar
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarBusy}
                className="px-3 py-1.5 border-2 border-black bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-yellow-400 active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload Picture
              </button>
              {avatarDataUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={avatarBusy}
                  className="px-3 py-1.5 border-2 border-black bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white active:translate-y-[1px] disabled:opacity-50"
                >
                  Remove
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarPick}
                className="hidden"
              />
            </div>
            {errors.avatar && (
              <p className="mt-1 text-[10px] text-red-600 font-bold">
                {errors.avatar}
              </p>
            )}
            {!errors.avatar && (
              <p className="mt-1 text-[10px] text-black/40">
                Image is resized to {MAX_AVATAR_DIM}×{MAX_AVATAR_DIM} on this
                device.
              </p>
            )}
          </div>
        </div>

        {/* Form fields */}
        <div className="px-4 py-4 space-y-4">
          <Field
            id="profile-name"
            label="Name"
            required
            value={name}
            onChange={setName}
            placeholder="Your full name"
            autoComplete="name"
            error={errors.name}
            maxLength={NAME_MAX}
          />
          <Field
            id="profile-phone"
            label="Phone Number"
            required
            value={phone}
            onChange={setPhone}
            placeholder="+963 9XX XXX XXX"
            autoComplete="tel"
            inputMode="tel"
            type="tel"
            error={errors.phone}
          />
          <Field
            id="profile-email"
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="optional"
            autoComplete="email"
            inputMode="email"
            type="email"
            error={errors.email}
          />
        </div>

        {/* Status */}
        {status.kind !== "idle" && (
          <div
            role={status.kind === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`mx-4 mb-3 border-2 border-black px-3 py-2 text-[11px] font-bold uppercase tracking-widest ${
              status.kind === "error"
                ? "bg-red-600 text-white"
                : status.kind === "saved"
                  ? "bg-green-600 text-white"
                  : "bg-yellow-400 text-black"
            }`}
          >
            {status.kind === "saving" && "Saving…"}
            {status.kind === "saved" && "Profile saved"}
            {status.kind === "error" && status.message}
          </div>
        )}

        {/* Actions */}
        <div className="px-4 pb-4 flex items-center gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 px-4 py-3 border-2 border-black bg-yellow-400 text-black text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-yellow-400 active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-yellow-400 disabled:hover:text-black"
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>
          {dirty && !saving && (
            <button
              type="button"
              onClick={handleDiscard}
              className="px-4 py-3 border-2 border-black bg-white text-black text-sm font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white active:translate-y-[1px]"
            >
              Discard
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Field                                                                      */
/* -------------------------------------------------------------------------- */

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email" | "numeric" | "decimal" | "search" | "url" | "none";
  type?: "text" | "tel" | "email";
  error?: string;
  maxLength?: number;
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  inputMode,
  type = "text",
  error,
  maxLength,
}: FieldProps) {
  const errId = `${id}-err`;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] font-bold uppercase tracking-widest text-black/60 mb-1"
      >
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errId : undefined}
        className={`w-full px-3 py-2 border-2 ${
          error ? "border-red-600" : "border-black"
        } bg-white text-black text-sm placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-yellow-400`}
      />
      {error && (
        <p id={errId} className="mt-1 text-[10px] text-red-600 font-bold">
          {error}
        </p>
      )}
    </div>
  );
}
