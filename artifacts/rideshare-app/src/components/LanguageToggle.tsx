import { useTranslation } from "react-i18next";

/**
 * Brutalist language toggle. Two-state pill switching between `en` and
 * `ar`. The button label always shows the language the user would
 * switch TO, not the active one — the convention for one-click toggles.
 *
 * IMPORTANT: clicking this changes the active i18n language but does
 * NOT re-flow the app to RTL. Most component strings are still
 * hard-coded English. Flipping to `ar` will only affect the keys that
 * have been ported to `t()` (see `src/i18n.ts`). A full Arabic port
 * needs: string extraction across components + `<html dir>` toggle +
 * Tailwind logical-property sweep + native-speaker review.
 */
export interface LanguageToggleProps {
  /** Visual variant. `dark` = on a dark surface (header). */
  variant?: "light" | "dark";
  className?: string;
}

export default function LanguageToggle({
  variant = "dark",
  className,
}: LanguageToggleProps) {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const next = current.startsWith("ar") ? "en" : "ar";
  const nextLabel = next === "ar" ? "عربي" : "EN";

  const handleClick = () => {
    void i18n.changeLanguage(next);
  };

  // On a black header bar we want sulfur-on-transparent with a sulfur
  // border; on a light surface we invert.
  const palette =
    variant === "dark"
      ? "border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
      : "border-black text-black hover:bg-black hover:text-yellow-400";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Switch language to ${next === "ar" ? "Arabic" : "English"}`}
      className={`px-2.5 py-1 border-2 bg-transparent text-[11px] font-bold uppercase tracking-widest active:translate-y-[1px] transition-colors ${palette} ${className ?? ""}`}
    >
      {nextLabel}
    </button>
  );
}
