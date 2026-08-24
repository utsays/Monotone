type Datum = { label: string; a: number; b: number };

function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} H${x} Z`;
}

export default function BarChart({
  data,
  max,
}: {
  data: Datum[];
  max: number;
}) {
  const W = 720;
  const H = 300;
  const padL = 34;
  const padB = 28;
  const padT = 10;
  const plotW = W - padL;
  const plotH = H - padB - padT;
  const groupW = plotW / data.length;
  const barW = Math.min(15, groupW / 3.2);
  const gap = 5;
  const ticks = [0, 1, 2, 3, 4];

  const y = (v: number) => padT + plotH - (v / max) * plotH;

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bar chart">
      {ticks.map((t) => {
        const yy = y(t * 1000);
        return (
          <g key={t}>
            <line x1={padL} y1={yy} x2={W} y2={yy} stroke="#eceef0" strokeWidth={1} />
            <text x={0} y={yy + 4} fontSize={11} fill="#8b9099" fontWeight={600}>
              {t}k
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const cx = padL + i * groupW + groupW / 2;
        const x1 = cx - barW - gap / 2;
        const x2 = cx + gap / 2;
        const hA = (d.a / max) * plotH;
        const hB = (d.b / max) * plotH;
        return (
          <g key={i}>
            <path d={topRounded(x2, y(d.b), barW, hB, 5)} fill="#c3c7cc" />
            <path d={topRounded(x1, y(d.a), barW, hA, 5)} fill="#17181c" />
            <text x={cx} y={H - 8} fontSize={11} fill="#8b9099" textAnchor="middle" fontWeight={600}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
