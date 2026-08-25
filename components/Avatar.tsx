import { avatarColor, initials } from "@/lib/ops";

export default function Avatar({
  name, url, color, size = 28, title, className = "",
}: {
  name: string;
  url?: string | null;
  color?: string | null;
  size?: number;
  title?: string;
  className?: string;
}) {
  const bg = color || avatarColor(name || "?");
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, background: url ? "transparent" : bg, fontSize: Math.round(size * 0.4) }}
      title={title ?? name}
    >
      {url ? <img src={url} alt={name} /> : initials(name || "?")}
    </span>
  );
}
