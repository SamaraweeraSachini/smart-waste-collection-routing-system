import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const API = "http://localhost:8080";

function nowTimeLabel() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Store a rolling window of history for charts (frontend-only)
  // Each item: { t, criticalBins, warningBins, routesToday, completedRoutesToday, totalDistanceTodayKm, totalBins }
  const [history, setHistory] = useState([]);
  const historyRef = useRef([]);

  const MAX_POINTS = 30; // 30 points * 5 seconds = 150 seconds (2.5 mins)

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/analytics/summary`);
      const data = await res.json();
      setSummary(data);

      // ✅ append to history
      const point = {
        t: nowTimeLabel(),
        totalBins: Number(data.totalBins || 0),
        criticalBins: Number(data.criticalBins || 0),
        warningBins: Number(data.warningBins || 0),
        routesToday: Number(data.routesToday || 0),
        completedRoutesToday: Number(data.completedRoutesToday || 0),
        totalDistanceTodayKm: Number(data.totalDistanceTodayKm || 0),
      };

      const next = [...historyRef.current, point].slice(-MAX_POINTS);
      historyRef.current = next;
      setHistory(next);
    } catch (e) {
      console.error(e);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  fetchSummary();
  // ✅ Auto refresh disabled
}, []);


  const health = useMemo(() => {
    if (!summary) return 0;
    const total = Number(summary.totalBins || 0);
    const critical = Number(summary.criticalBins || 0);
    const warning = Number(summary.warningBins || 0);

    if (total <= 0) return 0;
    const ok = Math.max(0, total - (critical + warning));
    return Math.round((ok / total) * 100);
  }, [summary]);

  const completionRate = useMemo(() => {
    if (!summary) return 0;
    const routes = Number(summary.routesToday || 0);
    const completed = Number(summary.completedRoutesToday || 0);
    if (routes <= 0) return 0;
    return Math.round((completed / routes) * 100);
  }, [summary]);

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2 style={{ marginBottom: 10 }}>📊 Analytics</h2>
        <div>Loading summary...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{ padding: 20 }}>
        <h2 style={{ marginBottom: 10 }}>📊 Analytics</h2>
        <div style={{ marginBottom: 12 }}>Failed to load analytics. Check backend.</div>
        <button onClick={fetchSummary} style={btnStyle}>Retry</button>
      </div>
    );
  }

  // ✅ Bar chart data (current snapshot)
  const snapshotBars = [
    { name: "Critical", value: Number(summary.criticalBins || 0) },
    { name: "Warning", value: Number(summary.warningBins || 0) },
    {
      name: "OK",
      value: Math.max(
        0,
        Number(summary.totalBins || 0) - (Number(summary.criticalBins || 0) + Number(summary.warningBins || 0))
      ),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>📊 Analytics Dashboard</h2>
        <button onClick={fetchSummary} style={btnStyle}>Refresh</button>
      </div>

      {/* KPI Cards */}
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <Card title="Total Bins" value={summary.totalBins} subtitle="registered in the city" />
        <Card title="Critical Bins" value={summary.criticalBins} subtitle="overflow or 95%+" accent="crimson" />
        <Card title="Warning Bins" value={summary.warningBins} subtitle="80% - 94%" accent="darkorange" />
        <Card title="Routes Today" value={summary.routesToday} subtitle="generated for today" />
        <Card title="Completed Routes" value={summary.completedRoutesToday} subtitle="finished today" accent="seagreen" />
        <Card title="Distance Today (km)" value={Number(summary.totalDistanceTodayKm || 0).toFixed(2)} subtitle="total planned distance" />
      </div>

      {/* Health + Completion */}
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
        <Panel title="🧠 System Health">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{health}% OK</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                OK = total - (critical + warning)
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ height: 14, width: "100%", background: "#0b1220", border: "1px solid #263244", borderRadius: 999 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.max(0, health))}%`,
                    background: "#22c55e",
                    borderRadius: 999,
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8, marginTop: 8 }}>
                <span>Critical: {summary.criticalBins}</span>
                <span>Warning: {summary.warningBins}</span>
                <span>Total: {summary.totalBins}</span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="✅ Route Completion Today">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{completionRate}%</div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                Completed / Total routes today
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ height: 14, width: "100%", background: "#0b1220", border: "1px solid #263244", borderRadius: 999 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.max(0, completionRate))}%`,
                    background: "#60a5fa",
                    borderRadius: 999,
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8, marginTop: 8 }}>
                <span>Routes: {summary.routesToday}</span>
                <span>Completed: {summary.completedRoutesToday}</span>
                <span>Distance: {Number(summary.totalDistanceTodayKm || 0).toFixed(2)} km</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Charts */}
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 12 }}>
        <Panel title="📉 Live Trend (last ~2.5 minutes)">
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="criticalBins" name="Critical" dot={false} />
                <Line type="monotone" dataKey="warningBins" name="Warning" dot={false} />
                <Line type="monotone" dataKey="completedRoutesToday" name="Completed Routes" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
            This chart is frontend-stored (demo). Later we’ll store history in DB for real analytics.
          </div>
        </Panel>

        <Panel title="📊 Current Bin Status Breakdown">
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={snapshotBars}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Bins" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
            Managers want this: “How many bins are critical right now?”
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
        Auto-refresh: every 5 seconds. This page tells managers what’s happening today without opening the map.
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{ padding: 14, borderRadius: 14, background: "#0b1220", border: "1px solid #263244" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Card({ title, value, subtitle, accent }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        background: "#0b1220",
        border: "1px solid #263244",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.85 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6, color: accent || "white" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{subtitle}</div>
    </div>
  );
}

const btnStyle = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #263244",
  background: "#0b1220",
  color: "white",
  cursor: "pointer",
};
