/**
 * i18next type augmentation for strongly-typed translation keys.
 *
 * This provides autocomplete and compile-time checking for all `t()` calls.
 * English JSON files are the source of truth for key shapes.
 */

import type { defaultNS, resources } from "./index";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)["en"];
  }
}
