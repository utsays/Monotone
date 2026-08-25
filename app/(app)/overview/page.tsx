import Icon from "@/components/Icon";
import Avatar from "@/components/Avatar";

const STATS = [
  { lbl: "Total Projects", val: "24", delta: "5", note: "Increased from last month", featured: true },
  { lbl: "Ended Projects", val: "10", delta: "6", note: "Increased from last month" },
  { lbl: "Running Projects", val: "12", delta: "2", note: "Increased from last month" },
  { lbl: "Pending Project", val: "2", note: "On Discuss" },
];

const BARS = [
  { d: "S", h: 44, hatch: true }, { d: "M", h: 78 }, { d: "T", h: 60, pct: 74 },
  { d: "W", h: 92 }, { d: "T", h: 54, hatch: true }, { d: "F", h: 66, hatch: true }, { d: "S", h: 50, hatch: true },
];

const PROJECTS = [
  { n: "Develop API Endpoints", due: "Nov 26, 2024" },
  { n: "Onboarding Flow", due: "Nov 28, 2024" },
  { n: "Build Dashboard", due: "Nov 30, 2024" },
  { n: "Optimize Page Load", due: "Dec 5, 2024" },
  { n: "Cross-Browser Testing", due: "Dec 6, 2024" },
];

const TEAM = [
  { name: "Alexandra Deff", on: "Github Project Repository", status: "Completed" },
  { name: "Edwin Adenike", on: "Integrate User Authentication System", status: "In Progress" },
  { name: "Isaac Oluwatemilorun", on: "Develop Search and Filter Functionality", status: "Pending" },
  { name: "David Oshodi", on: "Responsive Layout for Homepage", status: "In Progress" },
];

const statusCls = (s: string) => (s === "Completed" ? "completed" : s === "In Progress" ? "progress" : "pending");

export default function OverviewPage() {
  const pct = 41;
  const L = Math.PI * 80; // semicircle length

  return (
    <>
      <div className="dash-head">
        <div>
          <h1>Dashboard</h1>
          <p>Plan, prioritize, and accomplish your tasks with ease.</p>
        </div>
        <div className="dash-head-actions">
          <button className="btn"><Icon name="plus" size={17} strokeWidth={2.4} /> Add Project</button>
          <button className="btn-ghost"><Icon name="upload" size={16} /> Import Data</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="dstat-row">
        {STATS.map((s) => (
          <div key={s.lbl} className={`dstat${s.featured ? " featured" : ""}`}>
            <div className="dstat-top">
              <span className="dstat-lbl">{s.lbl}</span>
              <span className="arrow-circle"><Icon name="arrowUpRight" size={16} strokeWidth={2.2} /></span>
            </div>
            <div className="dstat-num">{s.val}</div>
            <div className="dstat-delta">
              {s.delta ? <span className="delta-pill"><Icon name="up" size={10} strokeWidth={3} />{s.delta}</span> : null}
              <span>{s.note}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div className="dash-row">
        <div className="panel">
          <div className="panel-head"><h3>Project Analytics</h3></div>
          <div className="bars">
            {BARS.map((b, i) => (
              <div className="bar-wrap" key={i}>
                <div className="bar-track">
                  {b.pct != null && <span className="bar-tip">{b.pct}%</span>}
                  <div className={`bar${b.hatch ? " hatch" : ""}`} style={{ height: `${b.h}%` }} />
                </div>
                <span className="bar-day">{b.d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Reminders</h3></div>
          <div className="reminder-title">Meeting with Arc Company</div>
          <div className="reminder-time">Time : 02.00 pm - 04.00 pm</div>
          <button className="btn btn-block" style={{ marginTop: 18 }}><Icon name="video" size={17} /> Start Meeting</button>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Project</h3><button className="chip-btn"><Icon name="plus" size={13} strokeWidth={2.6} /> New</button></div>
          {PROJECTS.map((p) => (
            <div className="pl-row" key={p.n}>
              <span className="pl-ic"><Icon name="box" size={15} /></span>
              <div><b>{p.n}</b><span>Due date: {p.due}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2 */}
      <div className="dash-row">
        <div className="panel">
          <div className="panel-head"><h3>Team Collaboration</h3><button className="chip-btn"><Icon name="plus" size={13} strokeWidth={2.6} /> Add Member</button></div>
          {TEAM.map((m) => (
            <div className="tc-row" key={m.name}>
              <Avatar name={m.name} size={38} />
              <div className="tc-info"><b>{m.name}</b><span>Working on <b>{m.on}</b></span></div>
              <span className={`tc-badge ${statusCls(m.status)}`}>{m.status}</span>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Project Progress</h3></div>
          <div className="gauge">
            <svg viewBox="0 0 200 118" className="chart-svg">
              <path d="M20 108 A80 80 0 0 1 180 108" fill="none" stroke="var(--series-2)" strokeWidth="18" strokeLinecap="round" strokeDasharray="4 9" />
              <path d="M20 108 A80 80 0 0 1 180 108" fill="none" stroke="url(#og)" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${(pct / 100) * L} ${L}`} />
              <defs><linearGradient id="og" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ff7a45" /><stop offset="1" stopColor="#FF5A1F" /></linearGradient></defs>
              <text x="100" y="96" textAnchor="middle" fontSize="30" fontWeight="800" fill="var(--ink)">{pct}%</text>
              <text x="100" y="112" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--ink-soft)">Project Ended</text>
            </svg>
          </div>
          <div className="gauge-legend">
            <span><i className="gl solid" /> Completed</span>
            <span><i className="gl deep" /> In Progress</span>
            <span><i className="gl hatch" /> Pending</span>
          </div>
        </div>

        <div className="panel time-tracker">
          <h3>Time Tracker</h3>
          <div className="tt-time">01:24:08</div>
          <div className="tt-controls">
            <button className="tt-btn"><Icon name="pause" size={18} /></button>
            <button className="tt-btn stop"><Icon name="stop" size={16} /></button>
          </div>
        </div>
      </div>
    </>
  );
}
