import { defineConfig } from "i18next-cli";

export default defineConfig({
  locales: ["en", "zh-CN"],
  extract: {
    input: ["src/**/*.{ts,tsx}"],
    output: "src/i18n/locales/{{language}}/{{namespace}}.json",
    ignore: ["node_modules/**", "src/i18n/**"],
    outputFormat: "json",
    functions: ["t", "*.t"],
    transComponents: ["Trans"],
    useTranslationNames: ["useTranslation"],
    defaultNS: "common",
    keySeparator: ".",
    removeUnusedKeys: false, // Keep manually-added keys safe
    sort: false
  },
  types: {
    input: ["src/i18n/locales/en/**/*.json"],
    basePath: "src/i18n/locales/en",
    output: "src/i18n/i18next.d.ts",
  },
});
