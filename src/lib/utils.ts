/**
 * Utility function for merging Tailwind CSS classes.
 * This is the standard shadcn/ui `cn` helper.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
