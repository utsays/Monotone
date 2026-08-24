export default function RadarChart({
  seriesA,
  seriesB,
}: {
  seriesA: number[]; // 0..1 per axis (dark)
  seriesB: number[]; // 0..1 per axis (gray)
}) {
  const n = seriesA.length;
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const R = 96;
  const rings = [0.25, 0.5, 0.75, 1];

  const angle = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pt = (i: number, r: number) => [
    cx + Math.cos(angle(i)) * R * r,
    cy + Math.sin(angle(i)) * R * r,
  ];
  const poly = (s: number[]) =>
    s.map((v, i) => pt(i, v).join(",")).join(" ");
  const ringPoly = (r: number) =>
    Array.from({ length: n }, (_, i) => pt(i, r).join(",")).join(" ");

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Radar chart"
      style={{ maxWidth: 300, margin: "0 auto" }}
    >
      {rings.map((r) => (
        <polygon
          key={r}
          points={ringPoly(r)}
          fill="none"
          stroke="#e7e9ec"
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#eceef0" strokeWidth={1} />;
      })}

      <polygon points={poly(seriesB)} fill="#c3c7cc" fillOpacity={0.75} stroke="#c3c7cc" strokeWidth={1.5} />
      <polygon points={poly(seriesA)} fill="#17181c" fillOpacity={0.85} stroke="#17181c" strokeWidth={1.5} />

      {Array.from({ length: n }, (_, i) => {
        const [x, y] = pt(i, 1);
        return <circle key={i} cx={x} cy={y} r={2.6} fill="#17181c" />;
      })}
    </svg>
  );
}
