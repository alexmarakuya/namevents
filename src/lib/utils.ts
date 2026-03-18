import type { Entity, EventStage, EventFormat } from "@/generated/prisma/client";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[āàáâã]/g, "a")
    .replace(/[ēèéêë]/g, "e")
    .replace(/[īìíîï]/g, "i")
    .replace(/[ōòóôõ]/g, "o")
    .replace(/[ūùúûü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const ENTITY_LABELS: Record<Entity, string> = {
  KIN_HAUS: "Kin Haus",
  AI_MEETUP: "AI Meetup",
  ISLAND_CONNECTION: "Island Connection",
  NAM_SPACE: "NāM Space",
  EXTERNAL: "External",
};

export const ENTITY_COLORS: Record<Entity, string> = {
  KIN_HAUS: "var(--entity-kin-haus)",
  AI_MEETUP: "var(--entity-ai-meetup)",
  ISLAND_CONNECTION: "var(--entity-island-connection)",
  NAM_SPACE: "var(--entity-nam-space)",
  EXTERNAL: "var(--entity-external)",
};

export const ENTITY_BG_CLASSES: Record<Entity, string> = {
  KIN_HAUS: "bg-[var(--entity-kin-haus)]",
  AI_MEETUP: "bg-[var(--entity-ai-meetup)]",
  ISLAND_CONNECTION: "bg-[var(--entity-island-connection)]",
  NAM_SPACE: "bg-[var(--entity-nam-space)]",
  EXTERNAL: "bg-[var(--entity-external)]",
};

export const ENTITY_BORDER_CLASSES: Record<Entity, string> = {
  KIN_HAUS: "border-l-[var(--entity-kin-haus)]",
  AI_MEETUP: "border-l-[var(--entity-ai-meetup)]",
  ISLAND_CONNECTION: "border-l-[var(--entity-island-connection)]",
  NAM_SPACE: "border-l-[var(--entity-nam-space)]",
  EXTERNAL: "border-l-[var(--entity-external)]",
};

export const STAGE_LABELS: Record<EventStage, string> = {
  SEED: "Seed",
  BREWING: "Brewing",
  CONFIRMED: "Confirmed",
  ANNOUNCED: "Announced",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const STAGE_ORDER: EventStage[] = [
  "SEED",
  "BREWING",
  "CONFIRMED",
  "ANNOUNCED",
  "DONE",
];

export const FORMAT_LABELS: Record<EventFormat, string> = {
  SOCIAL: "Social",
  MEETUP: "Meetup",
  WORKSHOP: "Workshop",
  PERFORMANCE: "Performance",
  COMMUNITY: "Community",
  RETREAT: "Retreat",
  POPUP: "Pop-up",
};

export function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateForInput(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
