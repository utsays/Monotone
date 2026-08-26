import type { TaskState, Tag } from "./types";

/** Fallback label colours for the well-known tags (used until a tag has its own colour). */
export const LABEL_COLORS: Record<string, { bg: string; fg: string }> = {
  Content: { bg: "#f3e4dd", fg: "#a24a2f" },
  Learn: { bg: "#eef0e7", fg: "#4a4c44" },
  Make: { bg: "#eef7d6", fg: "#5c7a17" },
  Website: { bg: "#e6eaee", fg: "#445468" },
  Research: { bg: "#eef0e7", fg: "#4a4c44" },
  Sales: { bg: "#f3e4dd", fg: "#a24a2f" },
  Brand: { bg: "#efe6ec", fg: "#6b4a63" },
  Offer: { bg: "#eef7d6", fg: "#5c7a17" },
  Design: { bg: "#e6eaee", fg: "#445468" },
  Ops: { bg: "#e5ece9", fg: "#3f6b60" },
};

/** Palette users pick from when creating a tag — a restrained Swiss information set (flat, muted, no neon). */
export const TAG_PALETTE = [
  "#121210", "#5c7a17", "#445468", "#a24a2f",
  "#6b4a63", "#3f6b60", "#8b8d80", "#43443c",
];

export function labelColor(name: string) {
  return LABEL_COLORS[name] ?? { bg: "#eef0e7", fg: "#4a4c44" };
}

/** Resolve a tag's chip colours: explicit colour if set, else the label fallback. */
export function tagChip(tag: Pick<Tag, "name" | "color">) {
  if (tag.color) return { bg: hexToSoft(tag.color), fg: tag.color };
  return labelColor(tag.name);
}
function hexToSoft(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0.15)`;
}

/** Deterministic avatar colour for a member, from their name. */
const AVATAR_COLORS = ["#121210", "#5c7a17", "#445468", "#a24a2f", "#6b4a63", "#3f6b60", "#8b8d80", "#43443c"];
export function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
export function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export const STATES: { key: TaskState; label: string }[] = [
  { key: "not_started", label: "Not started" },
  { key: "in_progress", label: "In progress" },
  { key: "waiting", label: "Waiting on partner" },
  { key: "blocked", label: "Blocked" },
  { key: "done", label: "Done" },
];
/** Task priority. Stored in the legacy `tasks.priority` text column; "none"/null = unset. */
export type Priority = "none" | "low" | "medium" | "high";
export const PRIORITIES: { key: Exclude<Priority, "none">; label: string; color: string }[] = [
  { key: "high", label: "High", color: "#b3452e" },
  { key: "medium", label: "Medium", color: "#5c7a17" },
  { key: "low", label: "Low", color: "#8b8d80" },
];
export function priorityMeta(p?: string | null) {
  return PRIORITIES.find((x) => x.key === p) ?? null;
}

export const STATE_LABEL: Record<TaskState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  waiting: "Waiting on partner",
  blocked: "Blocked",
  done: "Done",
};

/** Inclusive day span between two ISO dates (locked "estimate"). */
export function daysBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const a = new Date(start + "T00:00:00").getTime();
  const b = new Date(end + "T00:00:00").getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}
