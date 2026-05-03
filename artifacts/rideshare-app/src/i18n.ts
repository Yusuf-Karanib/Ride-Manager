import i18n from "i18next";
import { initReactI18next } from "react-i18next";

/**
 * i18n bootstrap.
 *
 * Default language is `'en'`. Arabic strings are best-effort and not
 * yet reviewed by a native speaker — flag for review before going to
 * production. Switching the active language at runtime is wired
 * through `LanguageToggle`. RTL layout (html dir, Tailwind logical
 * properties) is NOT yet wired — flipping to `ar` translates strings
 * but does not flip the layout.
 *
 * To opt a string into i18n: replace the literal with `t('some.key')`
 * and add the matching entry to BOTH dictionaries below. Missing keys
 * fall back to the key string itself, which is loud enough to catch.
 */

const resources = {
  en: {
    translation: {
      common: {
        brand: "FAST24",
        servicesHeader: "Services",
        close: "Close",
      },
      services: {
        sectionTitle: "Go anywhere",
        section01Subtitle:
          "Pick a vehicle that fits your trip and your budget.",
        ariaPage: "FAST24 services",
        ariaList: "Ride services",
        ariaClose: "Close services",
        footnote:
          "Cash-only. Zero commission. Prices are negotiated directly with drivers — no surge pricing, ever.",
        taxi: { title: "Standard Taxi", blurb: "City rides, metered pace" },
        motorcycle: {
          title: "Motorcycle",
          blurb: "Quick, traffic-proof",
          badge: "Saves fuel",
        },
        microbus: {
          title: "Microbus",
          blurb: "Shared servis routes",
          badge: "Cheapest",
        },
        vip: { title: "VIP Car", blurb: "Sedan, A/C, top-rated" },
      },
      delivery: {
        sectionTitle: "Deliver anything",
        section02Subtitle:
          "Send a package across town. The WhatsApp 'pick this up' scenario, formalised.",
        ariaList: "Delivery services",
        package: {
          title: "Package Delivery",
          blurb: "Send anything across town — handed driver-to-driver",
        },
        placeholder: { line1: "More services", line2: "coming soon" },
      },
      language: { toggleLabel: "Language" },
    },
  },
  ar: {
    translation: {
      common: {
        brand: "FAST24",
        servicesHeader: "الخدمات",
        close: "إغلاق",
      },
      services: {
        sectionTitle: "اذهب إلى أي مكان",
        section01Subtitle: "اختر مركبة تناسب رحلتك وميزانيتك.",
        ariaPage: "خدمات فاست24",
        ariaList: "خدمات النقل",
        ariaClose: "إغلاق الخدمات",
        footnote:
          "الدفع نقداً فقط. بدون عمولة. الأسعار يتم الاتفاق عليها مباشرة مع السائق — بدون أي تسعير متغيّر.",
        taxi: { title: "تاكسي عادي", blurb: "رحلات داخل المدينة" },
        motorcycle: {
          title: "دراجة نارية",
          blurb: "سريعة وتتجاوز الزحام",
          badge: "يوفّر الوقود",
        },
        microbus: {
          title: "ميكروباص",
          blurb: "خطوط السرفيس المشتركة",
          badge: "الأرخص",
        },
        vip: { title: "سيارة VIP", blurb: "سيدان مكيّفة، الأعلى تقييماً" },
      },
      delivery: {
        sectionTitle: "توصيل أي شيء",
        section02Subtitle:
          "أرسل طرداً عبر المدينة. سيناريو 'خذ لي هذا' الواتساب، بشكل رسمي.",
        ariaList: "خدمات التوصيل",
        package: {
          title: "توصيل الطرود",
          blurb: "أرسل أي شيء عبر المدينة — يُسلَّم من سائق إلى سائق",
        },
        placeholder: { line1: "خدمات إضافية", line2: "قريباً" },
      },
      language: { toggleLabel: "اللغة" },
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
