import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function RouteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fetchRoute = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/routes");
      const all = await res.json();
      const found = (all || []).find(r => String(r.id) === String(id));
      setRoute(found || null);
    } catch (e) {
      console.error(e);
      setRoute(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = useMemo(() => {
    const s = (route?.status || "assigned").toLowerCase();
    return s;
  }, [route]);

  const updateStatus = async (newStatus) => {
    setMsg("");
    try {
      const res = await fetch(`http://localhost:8080/api/routes/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update status");
      }

      setMsg(`✅ Status updated to: ${newStatus}`);
      await fetchRoute();
    } catch (e) {
      console.error(e);
      setMsg(`❌ ${e.message}`);
    }
  };

  const statusBadgeStyle = (s) => {
    if (s === "completed") return { background: "#16a34a", color: "white" };
    if (s === "in_progress") return { background: "#f59e0b", color: "black" };
    return { background: "#3b82f6", color: "white" }; // assigned
  };

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (!route) return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>Route not found.</div>
      <button onClick={() => navigate(-1)}>⬅ Back</button>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        ⬅ Back
      </button>

      <h2 style={{ marginBottom: 8 }}>Route #{route.id}</h2>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 12,
            ...statusBadgeStyle(status),
          }}
        >
          {status.toUpperCase()}
        </div>

        <div style={{ color: "#6b7280" }}>
          Driver: <strong>{route.driverId}</strong> | Date: <strong>{route.routeDate}</strong>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        Distance: <strong>{Number(route.distanceKm || 0).toFixed(2)} km</strong>
      </div>

      <div style={{ marginBottom: 16 }}>
        Bins: <strong>{(route.binIds || []).join(", ") || "-"}</strong>
      </div>

      {/* ✅ Workflow buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => updateStatus("assigned")}
          disabled={status !== "assigned"}
          style={{ padding: "10px 12px", cursor: status === "assigned" ? "pointer" : "not-allowed" }}
          title="Already assigned (starting point)"
        >
          ✅ Assigned
        </button>

        <button
          onClick={() => updateStatus("in_progress")}
          disabled={status !== "assigned"}
          style={{ padding: "10px 12px", cursor: status === "assigned" ? "pointer" : "not-allowed" }}
        >
          ▶ Start Route
        </button>

        <button
          onClick={() => updateStatus("completed")}
          disabled={status !== "in_progress"}
          style={{ padding: "10px 12px", cursor: status === "in_progress" ? "pointer" : "not-allowed" }}
        >
          🏁 Complete Route
        </button>
      </div>

      {msg ? (
        <div style={{ padding: 10, borderRadius: 10, background: "#111827", color: "white" }}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}
