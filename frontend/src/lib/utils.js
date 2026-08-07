import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function initials(name) {
  const parts = typeof name === 'string' ? name.trim().split(/\s+/).filter(Boolean) : [];
  return parts.length ? parts.map((part) => part[0]).join('').slice(0, 2).toUpperCase() : '?';
}
