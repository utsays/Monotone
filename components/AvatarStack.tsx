import Avatar from "./Avatar";
import type { Member } from "@/lib/types";

/** Overlapping stack of assignee avatars with a "+N" overflow chip. */
export default function AvatarStack({ members, size = 26, max = 3 }: {
  members: Member[];
  size?: number;
  max?: number;
}) {
  if (!members.length) return null;
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <div className="av-stack">
      {shown.map((m, i) => (
        <span key={m.id} className="av-stack-item" style={{ zIndex: max - i }} title={m.name}>
          <Avatar name={m.name} url={m.avatar_url} color={m.avatar_color} size={size} />
        </span>
      ))}
      {extra > 0 && <span className="av-more" style={{ width: size, height: size }}>+{extra}</span>}
    </div>
  );
}
