/**
 * Language switcher — allows users to change the UI language.
 */

import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select } from "@/components/ui/select";
import { supportedLanguages } from "@/i18n";

const languageLabels: Record<string, string> = {
  en: "English",
  "zh-CN": "简体中文",
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    void i18n.changeLanguage(e.target.value);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
      <Select
        value={i18n.resolvedLanguage ?? "en"}
        onChange={handleChange}
        className="h-8 w-[120px] text-xs"
        aria-label="Select language"
      >
        {supportedLanguages.map((lng) => (
          <option key={lng} value={lng}>
            {languageLabels[lng]}
          </option>
        ))}
      </Select>
    </div>
  );
}
