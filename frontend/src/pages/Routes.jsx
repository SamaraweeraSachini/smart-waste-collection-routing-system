// frontend/src/pages/Routes.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RoutesPage() {
  const navigate = useNavigate();

  const [routes, setRoutes] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8080/api/routes");
      const data = await res.json();
      setRoutes(data || []);
    } catch (e) {
      console.error(e);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const availableDates = useMemo(() => {
    const set = new Set();
    for (const r of routes) {
      if (r.routeDate) set.add(r.routeDate);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [routes]);

  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  const filteredRoutes = useMemo(() => {
    if (!selectedDate) return routes;
    return routes.filter((r) => r.routeDate === selectedDate);
  }, [routes, selectedDate]);

  const badge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "completed") return badgeEl("#16a34a", "COMPLETED");
    if (s === "in_progress") return badgeEl("#f59e0b", "IN PROGRESS");
    return badgeEl("#3b82f6", "PENDING");
  };

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>🛣️ Routes</h2>
          <div style={{ color: "#6b7280" }}>
            Click a route to open full route details + map + status controls.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Dates</option>
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <button style={btnPrimary} onClick={fetchRoutes}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, ...cardStyle }}>
        {loading ? (
          <div>Loading routes...</div>
        ) : filteredRoutes.length === 0 ? (
          <div style={{ color: "#6b7280" }}>
            No routes found for: <strong>{selectedDate || "All Dates"}</strong>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={thStyle}>Route ID</th>
                  <th style={thStyle}>Driver</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Bins</th>
                  <th style={thStyle}>Distance (km)</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRoutes.map((r) => {
                  return (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/routes/${r.id}`)}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={tdStyle}>#{r.id}</td>
                      <td style={tdStyle}>Driver {r.driverId}</td>
                      <td style={tdStyle}>{r.routeDate}</td>
                      <td style={tdStyle}>{Array.isArray(r.binIds) ? r.binIds.length : 0}</td>
                      <td style={tdStyle}>{Number(r.distanceKm || 0).toFixed(2)}</td>
                      <td style={tdStyle}>{badge(r.status)}</td>
                      <td style={tdStyle}>
                        <button
                          style={btnDark}
                          onClick={(e) => {
                            e.stopPropagation(); // ✅ don't trigger row click twice
                            navigate(`/routes/${r.id}`);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
              ✅ Total routes shown: <strong>{filteredRoutes.length}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------ styles ------------ */

const cardStyle = {
  background: "white",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
};

const thStyle = {
  padding: "12px 10px",
  fontSize: 13,
  fontWeight: 900,
  color: "#374151",
};

const tdStyle = {
  padding: "12px 10px",
  fontSize: 14,
  color: "#111827",
  verticalAlign: "middle",
};

const selectStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  fontWeight: 700,
  outline: "none",
};

const badgeEl = (bg, text) => (
  <span
    style={{
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: 999,
      background: bg,
      color: "white",
      fontSize: 12,
      fontWeight: 900,
    }}
  >
    {text}
  </span>
);

const btnBase = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "none",
  fontWeight: 800,
  cursor: "pointer",
};

const btnPrimary = {
  ...btnBase,
  background: "#111827",
  color: "white",
};

const btnDark = {
  ...btnBase,
  background: "#0f172a",
  color: "white",
};
