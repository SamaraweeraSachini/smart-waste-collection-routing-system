import { useEffect, useMemo, useState } from "react";

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8080/api/analytics/summary");
      const data = await res.json();
      setSummary(data);
    } catch (e) {
      console.error(e);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 5000); // refresh every 5s
    return () => clearInterval(interval);
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

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>📊 Analytics Dashboard</h2>
        <button onClick={fetchSummary} style={btnStyle}>Refresh</button>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <Card title="Total Bins" value={summary.totalBins} subtitle="registered in the city" />
        <Card title="Critical Bins" value={summary.criticalBins} subtitle="overflow or 95%+" accent="crimson" />
        <Card title="Warning Bins" value={summary.warningBins} subtitle="80% - 94%" accent="darkorange" />
        <Card title="Routes Today" value={summary.routesToday} subtitle="generated for today" />
        <Card title="Completed Routes" value={summary.completedRoutesToday} subtitle="finished today" accent="seagreen" />
        <Card title="Distance Today (km)" value={Number(summary.totalDistanceTodayKm || 0).toFixed(2)} subtitle="total planned distance" />
      </div>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#111827", border: "1px solid #263244" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>🧠 System Health</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{health}% OK</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
              OK bins = total - (critical + warning)
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ height: 14, width: "100%", background: "#0b1220", border: "1px solid #263244", borderRadius: 999 }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, Math.max(0, health))}%`,
                  background: "#22c55e",
                  borderRadius: 999
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
      </div>

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
        Auto-refresh: every 5 seconds. This page is what managers love because it tells them “what’s happening today” without opening the map.
      </div>
    </div>
  );
}

function Card({ title, value, subtitle, accent }) {
  return (
    <div style={{
      padding: 14,
      borderRadius: 12,
      background: "#0b1220",
      border: "1px solid #263244"
    }}>
      <div style={{ fontSize: 13, opacity: 0.85 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: accent || "white" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{subtitle}</div>
    </div>
  );
}

const btnStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #263244",
  background: "#0b1220",
  color: "white",
  cursor: "pointer"
};
