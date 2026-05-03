/**
 * i18next initialization — imported before React renders.
 *
 * All translations are bundled inline (no lazy loading) since the
 * total corpus is ~200 strings across 2 languages.
 */

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

// English namespaces
import enCommon from "./locales/en/common.json";
import enConfig from "./locales/en/config.json";
import enDashboard from "./locales/en/dashboard.json";
import enImport from "./locales/en/import.json";
import enLogging from "./locales/en/logging.json";
import enMiddleware from "./locales/en/middleware.json";
import enSites from "./locales/en/sites.json";
import enTemplates from "./locales/en/templates.json";
import enTls from "./locales/en/tls.json";
import enUpstreams from "./locales/en/upstreams.json";

// Chinese (Simplified) namespaces
import zhCNCommon from "./locales/zh-CN/common.json";
import zhCNConfig from "./locales/zh-CN/config.json";
import zhCNDashboard from "./locales/zh-CN/dashboard.json";
import zhCNImport from "./locales/zh-CN/import.json";
import zhCNLogging from "./locales/zh-CN/logging.json";
import zhCNMiddleware from "./locales/zh-CN/middleware.json";
import zhCNSites from "./locales/zh-CN/sites.json";
import zhCNTemplates from "./locales/zh-CN/templates.json";
import zhCNTls from "./locales/zh-CN/tls.json";
import zhCNUpstreams from "./locales/zh-CN/upstreams.json";

export const defaultNS = "common";
export const supportedLanguages = ["en", "zh-CN"] as const;

export const resources = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
    sites: enSites,
    upstreams: enUpstreams,
    tls: enTls,
    logging: enLogging,
    import: enImport,
    templates: enTemplates,
    config: enConfig,
    middleware: enMiddleware,
  },
  "zh-CN": {
    common: zhCNCommon,
    dashboard: zhCNDashboard,
    sites: zhCNSites,
    upstreams: zhCNUpstreams,
    tls: zhCNTls,
    logging: zhCNLogging,
    import: zhCNImport,
    templates: zhCNTemplates,
    config: zhCNConfig,
    middleware: zhCNMiddleware,
  },
} as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: "en",
    supportedLngs: [...supportedLanguages],

    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "caddy-ui-language",
      caches: ["localStorage"],
    },
  });

export default i18n;
