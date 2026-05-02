import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@/context/UserContext";
import {
  submitDriverApplication,
  uploadDriverDoc,
  type DriverDocType,
} from "@/lib/api";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPT_DOC = "image/png,image/jpeg,image/webp,application/pdf";
const ACCEPT_PHOTO = "image/png,image/jpeg,image/webp";

// Loose Syrian mobile pattern: optional +963 / 00963 / 0, then 9 followed by 8 digits.
const PHONE_PATTERN = /^(?:\+?963|0)?9\d{8}$/;

interface DocConfig {
  key: DriverDocType;
  label: string;
  accept: string;
  hint: string;
}

const DOCS: readonly DocConfig[] = [
  {
    key: "national_id",
    label: "National ID",
    accept: ACCEPT_DOC,
    hint: "Front side, all four corners visible.",
  },
  {
    key: "drivers_license",
    label: "Driver's License",
    accept: ACCEPT_DOC,
    hint: "Both sides if printed on two sides.",
  },
  {
    key: "vehicle_photo",
    label: "Vehicle Photo",
    accept: ACCEPT_PHOTO,
    hint: "Side view, license plate readable.",
  },
];

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type DocFiles = Partial<Record<DriverDocType, File>>;
type Step = 1 | 2 | 3;

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; current: DriverDocType }
  | { kind: "saving" }
  | { kind: "success" }
  | { kind: "error"; message: string };

interface DriverOnboardingProps {
  onComplete?: () => void;
  onCancel?: () => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizePhone(p: string): string {
  return p.replace(/[\s\-()]/g, "");
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function DriverOnboarding({
  onComplete,
  onCancel,
  className,
}: DriverOnboardingProps) {
  const { deviceId } = useUser();

  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [files, setFiles] = useState<DocFiles>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Object URLs for image previews; revoke on change/unmount to avoid leaks.
  const previewsRef = useRef<Partial<Record<DriverDocType, string>>>({});
  const previews = useMemo(() => {
    const out: Partial<Record<DriverDocType, string>> = {};
    for (const doc of DOCS) {
      const f = files[doc.key];
      if (f && f.type.startsWith("image/")) {
        out[doc.key] = URL.createObjectURL(f);
      }
    }
    // Revoke any URLs from a prior render that aren't being reused.
    for (const key of Object.keys(previewsRef.current) as DriverDocType[]) {
      const old = previewsRef.current[key];
      if (old && old !== out[key]) URL.revokeObjectURL(old);
    }
    previewsRef.current = out;
    return out;
  }, [files]);
  useEffect(() => {
    return () => {
      for (const url of Object.values(previewsRef.current)) {
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, []);

  /* --- step 1 validation ------------------------------------------------- */
  const step1Error = useMemo(() => {
    if (fullName.trim().length < 2) return "Enter your full name.";
    const cleaned = normalizePhone(phone);
    if (!PHONE_PATTERN.test(cleaned))
      return "Enter a valid Syrian mobile (e.g. 0991234567).";
    return null;
  }, [fullName, phone]);

  /* --- step 2 validation ------------------------------------------------- */
  const fileErrors = useMemo(() => {
    const errs: Partial<Record<DriverDocType, string>> = {};
    for (const doc of DOCS) {
      const f = files[doc.key];
      if (!f) continue;
      if (f.size > MAX_FILE_BYTES) {
        errs[doc.key] = `Too large (${formatBytes(f.size)}). Max 5 MB.`;
      }
    }
    return errs;
  }, [files]);

  const allDocsPresent = DOCS.every((d) => Boolean(files[d.key]));
  const step2Ready = allDocsPresent && Object.keys(fileErrors).length === 0;

  /* --- handlers ---------------------------------------------------------- */
  const handleFile = (key: DriverDocType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFiles((prev) => ({ ...prev, [key]: f }));
  };

  const goNext = () => {
    if (step === 1 && !step1Error) setStep(2);
    else if (step === 2 && step2Ready) setStep(3);
  };

  const goBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleSubmit = async () => {
    if (!step2Ready || step1Error) return;
    setStatus({ kind: "idle" });

    try {
      const urls: Partial<Record<DriverDocType, string>> = {};
      for (const doc of DOCS) {
        const f = files[doc.key];
        if (!f) throw new Error(`Missing ${doc.label}`);
        setStatus({ kind: "uploading", current: doc.key });
        urls[doc.key] = await uploadDriverDoc(deviceId, doc.key, f);
      }

      setStatus({ kind: "saving" });
      await submitDriverApplication({
        user_id: deviceId,
        full_name: fullName.trim(),
        phone: normalizePhone(phone),
        national_id_url: urls.national_id!,
        drivers_license_url: urls.drivers_license!,
        vehicle_photo_url: urls.vehicle_photo!,
      });

      setStatus({ kind: "success" });
      onComplete?.();
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Couldn't submit your application.",
      });
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  if (status.kind === "success") {
    return (
      <div
        className={`min-h-screen bg-white text-black flex flex-col items-center justify-center px-6 py-10 ${className ?? ""}`}
      >
        <div className="w-full max-w-sm border-2 border-black bg-yellow-400 p-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-black/70">
            Status
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight uppercase">
            Pending Review
          </h1>
          <p className="mt-3 text-sm text-black/80">
            Thanks, {fullName.trim().split(" ")[0]}. Your application is in
            review. We'll notify you when a decision is made — usually within
            24 hours.
          </p>
        </div>
        {onComplete && (
          <button
            type="button"
            onClick={onComplete}
            className="mt-6 px-6 py-2 bg-black text-white text-sm font-bold uppercase tracking-wider border-2 border-black hover:bg-gray-800"
          >
            Done
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-white text-black flex flex-col ${className ?? ""}`}
    >
      <Header step={step} onCancel={onCancel} />

      <div className="flex-1 px-6 py-6 max-w-sm w-full mx-auto">
        {step === 1 && (
          <Step1
            fullName={fullName}
            setFullName={setFullName}
            phone={phone}
            setPhone={setPhone}
            error={step1Error}
            allowSubmit={!step1Error}
            onNext={goNext}
          />
        )}

        {step === 2 && (
          <Step2
            files={files}
            previews={previews}
            errors={fileErrors}
            onFile={handleFile}
            onBack={goBack}
            onNext={goNext}
            ready={step2Ready}
          />
        )}

        {step === 3 && (
          <Step3
            fullName={fullName}
            phone={phone}
            files={files}
            status={status}
            onBack={status.kind === "idle" || status.kind === "error" ? goBack : undefined}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function Header({ step, onCancel }: { step: Step; onCancel?: () => void }) {
  return (
    <header className="bg-black text-white border-b-2 border-black px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
          Driver Application
        </p>
        <h1 className="text-base font-bold uppercase tracking-wider">
          {step === 1 ? "Your details" : step === 2 ? "Documents" : "Review & submit"}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <StepDots current={step} />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="ml-2 px-2 py-1 text-[11px] font-bold uppercase tracking-wider bg-yellow-400 text-black border-2 border-yellow-400 hover:bg-yellow-300"
          >
            Cancel
          </button>
        )}
      </div>
    </header>
  );
}

function StepDots({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Step ${current} of 3`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`block h-1.5 w-5 border border-yellow-400 ${
            n <= current ? "bg-yellow-400" : "bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}

function Step1({
  fullName,
  setFullName,
  phone,
  setPhone,
  error,
  allowSubmit,
  onNext,
}: {
  fullName: string;
  setFullName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  error: string | null;
  allowSubmit: boolean;
  onNext: () => void;
}) {
  const showError = error && (fullName.length > 0 || phone.length > 0);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
    >
      <Field label="Full Name">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="As written on your ID"
          maxLength={64}
          autoComplete="name"
          className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm focus:outline-none focus:bg-yellow-50"
        />
      </Field>

      <Field label="Mobile Number">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0991234567"
          inputMode="tel"
          autoComplete="tel"
          className="w-full px-3 py-2 border-2 border-black bg-white text-black text-sm font-mono focus:outline-none focus:bg-yellow-50"
        />
        <p className="mt-1 text-[10px] text-black/60">
          Syrian mobile · we'll send you SMS updates here.
        </p>
      </Field>

      {showError && (
        <p
          role="alert"
          className="border-2 border-black bg-red-600 text-white px-3 py-2 text-xs font-bold uppercase tracking-wider"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!allowSubmit}
        className="w-full py-3 bg-black text-white text-sm font-bold uppercase tracking-wider border-2 border-black hover:bg-yellow-400 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next: Documents
      </button>
    </form>
  );
}

function Step2({
  files,
  previews,
  errors,
  onFile,
  onBack,
  onNext,
  ready,
}: {
  files: DocFiles;
  previews: Partial<Record<DriverDocType, string>>;
  errors: Partial<Record<DriverDocType, string>>;
  onFile: (key: DriverDocType) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  onNext: () => void;
  ready: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-black/70">
        Upload three documents. Photos or PDF, max 5 MB each. Files are private
        and only seen by FAST24's review team.
      </p>

      {DOCS.map((doc) => {
        const file = files[doc.key];
        const preview = previews[doc.key];
        const error = errors[doc.key];
        return (
          <div key={doc.key} className="border-2 border-black bg-white">
            <div className="flex items-center justify-between px-3 py-2 border-b-2 border-black bg-gray-50">
              <span className="text-xs font-bold uppercase tracking-wider">
                {doc.label}
              </span>
              {file && !error && (
                <span className="px-1.5 py-0.5 bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest">
                  Ready
                </span>
              )}
            </div>
            <div className="p-3 space-y-2">
              <p className="text-[11px] text-black/60">{doc.hint}</p>

              {preview && (
                <img
                  src={preview}
                  alt={`${doc.label} preview`}
                  className="w-full h-32 object-cover border-2 border-black bg-gray-100"
                />
              )}

              {file && !preview && (
                <p className="px-2 py-1 border-2 border-black bg-gray-100 text-[11px] font-mono truncate">
                  {file.name} · {formatBytes(file.size)}
                </p>
              )}

              <label className="block">
                <span className="sr-only">Choose file for {doc.label}</span>
                <input
                  type="file"
                  accept={doc.accept}
                  onChange={onFile(doc.key)}
                  className="block w-full text-[11px] text-black file:mr-2 file:py-1.5 file:px-3 file:border-2 file:border-black file:bg-yellow-400 file:text-black file:font-bold file:uppercase file:tracking-wider file:text-[11px] hover:file:bg-yellow-300"
                />
              </label>

              {error && (
                <p
                  role="alert"
                  className="border-2 border-black bg-red-600 text-white px-2 py-1 text-[11px] font-bold uppercase tracking-wider"
                >
                  {error}
                </p>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2 px-3 border-2 border-black bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-yellow-100"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!ready}
          className="flex-1 py-2 px-3 bg-black text-white text-xs font-bold uppercase tracking-wider border-2 border-black hover:bg-yellow-400 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Review
        </button>
      </div>
    </div>
  );
}

function Step3({
  fullName,
  phone,
  files,
  status,
  onBack,
  onSubmit,
}: {
  fullName: string;
  phone: string;
  files: DocFiles;
  status: Status;
  onBack?: () => void;
  onSubmit: () => void;
}) {
  const busy = status.kind === "uploading" || status.kind === "saving";

  return (
    <div className="space-y-4">
      <div className="border-2 border-black bg-gray-50 p-3 space-y-2">
        <Row label="Name" value={fullName.trim()} />
        <Row label="Phone" value={normalizePhone(phone)} mono />
        {DOCS.map((doc) => {
          const f = files[doc.key];
          return (
            <Row
              key={doc.key}
              label={doc.label}
              value={f ? `${f.name} · ${formatBytes(f.size)}` : "—"}
              mono
            />
          );
        })}
      </div>

      <div className="border-2 border-black bg-yellow-400 px-3 py-2 text-[11px] text-black leading-tight">
        On submit, your status becomes{" "}
        <span className="font-bold uppercase tracking-wider">
          pending_review
        </span>
        . You can't accept rides until a reviewer approves your account.
      </div>

      {status.kind === "uploading" && (
        <p className="border-2 border-black bg-black text-white px-3 py-2 text-xs font-bold uppercase tracking-wider">
          Uploading {status.current.replace("_", " ")}…
        </p>
      )}
      {status.kind === "saving" && (
        <p className="border-2 border-black bg-black text-white px-3 py-2 text-xs font-bold uppercase tracking-wider">
          Saving application…
        </p>
      )}
      {status.kind === "error" && (
        <p
          role="alert"
          className="border-2 border-black bg-red-600 text-white px-3 py-2 text-xs font-bold uppercase tracking-wider"
        >
          {status.message}
        </p>
      )}

      <div className="flex gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="flex-1 py-2 px-3 border-2 border-black bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-yellow-100 disabled:opacity-50"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="flex-1 py-3 px-3 bg-black text-white text-sm font-bold uppercase tracking-wider border-2 border-black hover:bg-yellow-400 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Working…" : "Submit Application"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-black/60 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-black/60 shrink-0">
        {label}
      </span>
      <span
        className={`text-xs text-black truncate text-right ${mono ? "font-mono tabular-nums" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}
