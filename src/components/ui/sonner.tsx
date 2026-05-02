/**
 * Themed Toaster wrapper using sonner.
 * Provides toast notifications consistent with the app's design system.
 */

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className: "border bg-card text-card-foreground shadow-lg",
        descriptionClassName: "text-muted-foreground",
      }}
      closeButton
      richColors
    />
  );
}
