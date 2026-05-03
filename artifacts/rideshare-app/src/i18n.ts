import i18n from "i18next";
import { initReactI18next } from "react-i18next";

/**
 * i18n bootstrap.
 *
 * Default language is `'en'`. The original product spec is English-only;
 * Arabic dictionaries are scaffolded here so a translation pass can land
 * later without re-architecting. Switching the active language at runtime
 * is wired through `LanguageToggle`, but most UI strings are still
 * hard-coded in their components — flipping the toggle today only
 * affects keys that have already been ported (currently: just the
 * services hub labels below).
 *
 * To opt a string into i18n: replace the literal with `t('some.key')`
 * and add the matching entry to BOTH dictionaries below. Missing keys
 * fall back to the key string itself (i18next default), which is loud
 * enough to catch in review.
 */

const resources = {
  en: {
    translation: {
      services: {
        sectionTitle: "Go anywhere",
        taxi: { title: "Standard Taxi", blurb: "City rides, metered pace" },
        motorcycle: { title: "Motorcycle", blurb: "Quick, traffic-proof" },
        microbus: { title: "Microbus", blurb: "Shared servis routes" },
        vip: { title: "VIP Car", blurb: "Sedan, A/C, top-rated" },
      },
      delivery: {
        sectionTitle: "Deliver anything",
      },
      language: {
        toggleLabel: "Language",
      },
    },
  },
  ar: {
    translation: {
      services: {
        sectionTitle: "اذهب إلى أي مكان",
        taxi: { title: "تاكسي عادي", blurb: "رحلات داخل المدينة" },
        motorcycle: { title: "دراجة نارية", blurb: "سريعة وتتجاوز الزحام" },
        microbus: { title: "ميكروباص", blurb: "خطوط السرفيس المشتركة" },
        vip: { title: "سيارة VIP", blurb: "سيدان مكيّفة، الأعلى تقييماً" },
      },
      delivery: {
        sectionTitle: "توصيل أي شيء",
      },
      language: {
        toggleLabel: "اللغة",
      },
    },
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
