import Icon from "./Icon";

export default function ModulePlaceholder({
  icon,
  title,
  subtitle,
  planned,
}: {
  icon: string;
  title: string;
  subtitle: string;
  planned: string[];
}) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <button className="btn" disabled title="Available once we build this module">
          + New
        </button>
      </div>

      <div className="card">
        <div className="empty">
          <span
            style={{
              width: 66, height: 66, borderRadius: "50%", background: "var(--surface-2)",
              display: "grid", placeItems: "center", color: "var(--ink-2)", margin: "0 auto 14px",
            }}
          >
            <Icon name={icon} size={30} />
          </span>
          <h4>This module is next on the list</h4>
          <p className="muted" style={{ maxWidth: 460, margin: "0 auto" }}>
            The foundation (logins, shared cloud data, this navigation) is done.
            When we build <b>{title}</b>, it will include:
          </p>
        </div>
        <div style={{ maxWidth: 470, margin: "0 auto 8px" }}>
          {planned.map((p) => (
            <div key={p} className="row">
              <span>{p}</span>
              <span className="tag2">planned</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
