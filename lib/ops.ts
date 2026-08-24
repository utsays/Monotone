import type { TaskState, Tag } from "./types";

/** Fallback label colours for the well-known tags (used until a tag has its own colour). */
export const LABEL_COLORS: Record<string, { bg: string; fg: string }> = {
  Content: { bg: "#e4f3e9", fg: "#2f7d4f" },
  Learn: { bg: "#dff1ee", fg: "#1f7a6b" },
  Make: { bg: "#fde6e3", fg: "#c4483a" },
  Website: { bg: "#fde7e7", fg: "#c33b3b" },
  Research: { bg: "#fbeede", fg: "#b5701f" },
  Sales: { bg: "#fbf2d6", fg: "#8a6d1f" },
  Brand: { bg: "#f7efd6", fg: "#8a6a1a" },
  Offer: { bg: "#e4f3e9", fg: "#2f7d4f" },
  Design: { bg: "#ece9fb", fg: "#5b46c9" },
  Ops: { bg: "#e9edf2", fg: "#41505f" },
};

/** Palette users pick from when creating a tag. */
export const TAG_PALETTE = [
  "#2f7d4f", "#1f7a6b", "#c4483a", "#c33b3b", "#b5701f",
  "#8a6d1f", "#5b46c9", "#3f6ad6", "#41505f", "#b23a8b",
];

export function labelColor(name: string) {
  return LABEL_COLORS[name] ?? { bg: "#eceef0", fg: "#5a5f66" };
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
const AVATAR_COLORS = ["#17181c", "#3f6ad6", "#2f7d4f", "#b5701f", "#5b46c9", "#c4483a", "#1f7a6b", "#b23a8b"];
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
