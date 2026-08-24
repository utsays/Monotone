import Icon from "@/components/Icon";
import BarChart from "@/components/BarChart";
import RadarChart from "@/components/RadarChart";

const STATS = [
  { icon: "users", num: "128", lbl: "Total Clients", delta: "12.0%", dir: "up" },
  { icon: "dollar", num: "$48.2k", lbl: "Revenue (MTD)", delta: "30.9%", dir: "up", featured: true },
  { icon: "folder", num: "24", lbl: "Open Projects", delta: "8.5%", dir: "up" },
  { icon: "file", num: "12", lbl: "Proposals Sent", delta: "4.2%", dir: "down" },
  { icon: "check", num: "37", lbl: "Tasks Due", delta: "10.2%", dir: "up" },
];

const BARS = [
  { label: "S", a: 1900, b: 1050 }, { label: "M", a: 1050, b: 900 },
  { label: "T", a: 3200, b: 1900 }, { label: "W", a: 1050, b: 1050 },
  { label: "T", a: 3150, b: 1000 }, { label: "F", a: 2500, b: 2450 },
  { label: "S", a: 3800, b: 1800 }, { label: "S", a: 2200, b: 1950 },
  { label: "M", a: 1950, b: 1000 }, { label: "T", a: 2100, b: 2050 },
  { label: "W", a: 2450, b: 1150 }, { label: "T", a: 1600, b: 1200 },
  { label: "F", a: 1500, b: 700 }, { label: "S", a: 3400, b: 2600 },
];

const ROWS = [
  { name: "Brian Cook", role: "Acme Co.", code: "PRJ-1902", service: "Brand Redesign", owner: "You", value: "$12,400", status: "Active", solid: true },
  { name: "Julia Cooper", role: "Nordwind", code: "PRJ-4513", service: "Web App Build", owner: "Alex", value: "$28,900", status: "In Review", solid: false },
  { name: "Marcus Lee", role: "Bloom Ltd.", code: "PRJ-3320", service: "SEO Retainer", owner: "You", value: "$4,200", status: "Active", solid: true },
  { name: "Sara Reyes", role: "Vertex", code: "PRJ-2087", service: "Content Strategy", owner: "Alex", value: "$9,600", status: "In Review", solid: false },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function OverviewPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>A snapshot across your agency — sample data for now.</p>
        </div>
        <div className="pill-select">Last 15 days <Icon name="chevron" size={15} /></div>
      </div>

      {/* Stat cards */}
      <div className="stat-row">
        {STATS.map((s) => (
          <div key={s.lbl} className={`stat${s.featured ? " featured" : ""}`}>
            <span className="ic"><Icon name={s.icon} size={22} /></span>
            <div className="num">{s.num}</div>
            <div className="lbl">{s.lbl}</div>
            <div className={`delta ${s.dir}`}>
              <Icon name={s.dir} size={13} strokeWidth={2.2} />
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="panel">
          <div className="panel-head">
            <h3>Pipeline Overview</h3>
            <div className="pill-select">15 Days <Icon name="chevron" size={15} /></div>
          </div>
          <div className="legend2">
            <div className="li"><span className="sw dark" /><div><b>34.2k</b><br /><span>New Leads</span></div></div>
            <div className="li"><span className="sw gray" /><div><b>18.9k</b><br /><span>In Review</span></div></div>
          </div>
          <BarChart data={BARS} max={4000} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Today’s Status</h3>
            <div className="pill-select">15 Days <Icon name="chevron" size={15} /></div>
          </div>
          <div style={{ position: "relative" }}>
            <span className="radar-badge" style={{ position: "absolute", top: "46%", left: "30%", zIndex: 2 }}>
              <span className="dot" /> 12 Active
            </span>
            <RadarChart
              seriesA={[0.92, 0.6, 0.78, 0.5, 0.86, 0.55, 0.72, 0.62]}
              seriesB={[0.6, 0.82, 0.5, 0.76, 0.55, 0.72, 0.6, 0.8]}
            />
          </div>
          <div className="legend2" style={{ justifyContent: "center", marginTop: 6 }}>
            <div className="li"><span className="sw dark" /><div><b>87</b><br /><span>Won</span></div></div>
            <div className="li"><span className="sw gray" /><div><b>30</b><br /><span>In Review</span></div></div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        <table className="data">
          <thead>
            <tr>
              <th>Client</th><th>Code</th><th>Service</th><th>Owner</th><th>Value</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.code}>
                <td>
                  <div className="cell-user">
                    <div className="av">{initials(r.name)}</div>
                    <div><b>{r.name}</b><span>{r.role}</span></div>
                  </div>
                </td>
                <td><span className="code">{r.code}</span></td>
                <td>{r.service}</td>
                <td>{r.owner}</td>
                <td>{r.value}</td>
                <td><span className={`badge ${r.solid ? "solid" : "soft"}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
