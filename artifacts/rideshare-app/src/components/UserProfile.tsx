import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useUser, type UserProfile as UserProfileData } from "@/context/UserContext";

/* -------------------------------------------------------------------------- */
/* Public surface                                                             */
/* -------------------------------------------------------------------------- */

export interface UserProfileProps {
  /** Optional callback fired after a successful save. */
  onSaved?: (profile: UserProfileData) => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

// Syrian-friendly phone: accept "+963 9XX XXX XXX", "09XXXXXXXX", or
// 9-12 digits with optional spaces/hyphens. Intentionally permissive —
// strict E.164 rejects too many real-world entries.
const PHONE_RE = /^\+?[0-9\s-]{9,16}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: Pick<UserProfileData, "name" | "phone" | "email">): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) {
    errors.name = "Name is required.";
  } else if (values.name.trim().length < 2) {
    errors.name = "Name is too short.";
  }
  if (!values.phone.trim()) {
    errors.phone = "Phone is required.";
  } else if (!PHONE_RE.test(values.phone.trim())) {
    errors.phone = "Enter a valid phone number.";
  }
  // Email is optional. Only validate format if non-empty.
  if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
    errors.email = "Enter a valid email or leave blank.";
  }
  return errors;
}

/* -------------------------------------------------------------------------- */
/* Avatar resize                                                              */
/* -------------------------------------------------------------------------- */

const AVATAR_MAX_DIM = 512;
const AVATAR_QUALITY = 0.85;
const AVATAR_MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8 MB raw input cap.

/**
 * Downscale + re-encode an uploaded image to a JPEG data URL bounded by
 * `AVATAR_MAX_DIM`. Without this, a 4 MB phone photo lands in localStorage
 * uncompressed-as-base64 (~5.4 MB) and triggers QuotaExceededError on the
 * very next setItem.
 */
async function fileToResizedDataUrl(file: File): Promise<string> {
  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    throw new Error("Image is too large. Pick something under 8 MB.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Pick an image file (JPG, PNG, WEBP).");
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Couldn't read that image. Try a different file.");
  });

  const scale = Math.min(
    1,
    AVATAR_MAX_DIM / Math.max(bitmap.width, bitmap.height),
  );
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", AVATAR_QUALITY);
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function UserProfile({ onSaved, className }: UserProfileProps) {
  const { profile, saveProfile } = useUser();

  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(
    profile.avatarDataUrl,
  );

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-sync local form state when the underlying context profile changes
  // (e.g. saved on another tab and storage event lands). Only re-syncs
  // when the user isn't actively editing — otherwise we'd clobber input.
  useEffect(() => {
    if (submitting) return;
    setName(profile.name);
    setPhone(profile.phone);
    setEmail(profile.email);
    setAvatarDataUrl(profile.avatarDataUrl);
  }, [profile, submitting]);

  // Auto-dismiss the success flash so it doesn't stick around forever.
  useEffect(() => {
    if (!savedFlash) return;
    const t = window.setTimeout(() => setSavedFlash(false), 2500);
    return () => window.clearTimeout(t);
  }, [savedFlash]);

  const dirty =
    name !== profile.name ||
    phone !== profile.phone ||
    email !== profile.email ||
    avatarDataUrl !== profile.avatarDataUrl;

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input value so picking the SAME file twice still fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setAvatarBusy(true);
    setErrors((prev) => ({ ...prev, avatar: undefined }));
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setAvatarDataUrl(dataUrl);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        avatar:
          err instanceof Error ? err.message : "Couldn't process that image.",
      }));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarDataUrl(null);
    setErrors((prev) => ({ ...prev, avatar: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const fieldErrors = validate({ name, phone, email });
    setErrors((prev) => ({ ...fieldErrors, avatar: prev.avatar }));
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const next = await saveProfile({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        avatarDataUrl,
      });
      setSavedFlash(true);
      onSaved?.(next);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Couldn't save your profile.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const initials = getInitials(name || profile.name);

  return (
    <section
      className={`bg-white border-2 border-black p-4 ${className ?? ""}`}
      aria-label="Profile"
    >
      <header className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/60">
          Account
        </p>
        <h2 className="text-xl font-bold uppercase tracking-wider">
          Your Profile
        </h2>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        {/* Avatar block */}
        <div className="flex items-center gap-4 mb-5">
          <div
            className="relative w-20 h-20 rounded-full border-2 border-black bg-yellow-400 overflow-hidden flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            {avatarDataUrl ? (
              <img
                src={avatarDataUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-black tracking-wider">
                {initials || "??"}
              </span>
            )}
            {avatarBusy && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-400">
                  …
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="inline-flex items-center justify-center px-3 py-1.5 border-2 border-black bg-black text-yellow-400 text-[11px] font-bold uppercase tracking-widest cursor-pointer hover:bg-yellow-400 hover:text-black">
              Upload picture
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={avatarBusy || submitting}
                className="sr-only"
              />
            </label>
            {avatarDataUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={submitting}
                className="text-[10px] font-bold uppercase tracking-widest text-black/60 hover:text-red-600 disabled:opacity-40"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {errors.avatar && (
          <p
            role="alert"
            className="mb-3 border-2 border-black bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-2 py-1"
          >
            {errors.avatar}
          </p>
        )}

        {/* Name */}
        <Field
          id="profile-name"
          label="Name"
          required
          error={errors.name}
          value={name}
          onChange={setName}
          autoComplete="name"
          maxLength={80}
        />

        {/* Phone */}
        <Field
          id="profile-phone"
          label="Phone"
          required
          error={errors.phone}
          value={phone}
          onChange={setPhone}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+963 9XX XXX XXX"
          maxLength={20}
        />

        {/* Email */}
        <Field
          id="profile-email"
          label="Email"
          error={errors.email}
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          maxLength={120}
          hint="Optional — used for receipts."
        />

        {/* Submit-level error / success */}
        {submitError && (
          <p
            role="alert"
            className="mt-3 border-2 border-black bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-2 py-1"
          >
            {submitError}
          </p>
        )}
        {savedFlash && !submitError && (
          <p
            role="status"
            className="mt-3 border-2 border-black bg-green-600 text-white text-[11px] font-bold uppercase tracking-wider px-2 py-1"
          >
            Saved
          </p>
        )}

        {/* Submit */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-[10px] text-black/50 tabular-nums">
            {profile.updatedAt
              ? `Last saved ${formatDate(profile.updatedAt)}`
              : "Not saved yet"}
          </p>
          <button
            type="submit"
            disabled={submitting || avatarBusy || !dirty}
            className="px-4 py-2 border-2 border-black bg-yellow-400 text-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-yellow-400 active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Field — small reusable input                                               */
/* -------------------------------------------------------------------------- */

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  type?: "text" | "tel" | "email";
  autoComplete?: string;
  inputMode?: "tel" | "email" | "text";
  placeholder?: string;
  maxLength?: number;
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  error,
  hint,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  maxLength,
}: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="mb-3">
      <label
        htmlFor={id}
        className="block text-[10px] font-bold uppercase tracking-widest text-black/60 mb-1"
      >
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`
          block w-full px-3 py-2 border-2 bg-white text-black text-sm
          focus:outline-none focus:ring-0 focus:border-yellow-400
          ${error ? "border-red-600" : "border-black"}
        `}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1 text-[10px] text-black/50">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-[10px] font-bold uppercase tracking-widest text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
