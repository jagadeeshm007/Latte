import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** cn merges Tailwind classes; shadcn components import it from here. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
