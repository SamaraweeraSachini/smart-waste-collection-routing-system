import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const API = "http://localhost:8080";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DriverRoute() {
  const { driverId } = useParams();

  const [routes, setRoutes] = useState([]);
  const [bins, setBins] = useState([]);
  const [msg, setMsg] = useState("");

  const date = todayISO();

  const fetchRoutes = async () => {
    const res = await fetch(`${API}/api/routes?date=${encodeURIComponent(date)}`);
    const data = await res.json();
    setRoutes(data || []);
    return data || [];
  };

  const fetchBins = async () => {
    const res = await fetch(`${API}/api/bins`);
    const data = await res.json();
    setBins(data || []);
    return data || [];
  };

  useEffect(() => {
    fetchRoutes();
    fetchBins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myRoute = useMemo(() => {
    return routes.find((r) => Number(r.driverId) === Number(driverId));
  }, [routes, driverId]);

  const routeStatus = String(myRoute?.status || "").toLowerCase();

  const getStatusBadge = () => {
    if (routeStatus === "completed") return "✅ COMPLETED";
    if (routeStatus === "in_progress") return "🚚 IN_PROGRESS";
    if (routeStatus === "assigned" || routeStatus === "pending") return "📌 ASSIGNED";
    return myRoute?.status || "-";
  };

  const binDetails = useMemo(() => {
    if (!myRoute?.binIds) return [];
    return myRoute.binIds.map((id) => bins.find((b) => Number(b.id) === Number(id))).filter(Boolean);
  }, [myRoute, bins]);

  const handleStartRoute = async () => {
    if (!myRoute?.id) return;

    try {
      setMsg("Starting route...");

      await fetch(`${API}/api/routes/${myRoute.id}/status?status=in_progress`, {
        method: "PATCH",
      });

      await fetchRoutes();
      setMsg("✅ Route started!");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to start route");
    }
  };

  const handleCollectBin = async (binId) => {
    if (!myRoute?.id) return;

    try {
      setMsg(`Collecting Bin #${binId}...`);

      await fetch(`${API}/api/routes/${myRoute.id}/collect-bin/${binId}`, {
        method: "POST",
      });

      await fetchBins();
      await fetchRoutes();

      setMsg(`✅ Bin #${binId} collected`);
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to collect bin");
    }
  };

  if (!myRoute) {
    return (
      <div style={{ padding: 20 }}>
        <h2>🚚 Driver Route</h2>
        <p style={{ color: "#666" }}>
          No route assigned today for Driver #{driverId}.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 6 }}>🚚 Driver #{driverId} - Today’s Route</h2>
      <div style={{ color: "#666", marginBottom: 16 }}>
        📅 Date: <strong>{date}</strong>
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 14,
          border: "1px solid #ddd",
          background: "#fafafa",
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          Route ID: {myRoute.id}
        </div>
        <div style={{ marginTop: 6 }}>
          Status: <strong>{getStatusBadge()}</strong>
        </div>
        <div style={{ marginTop: 6 }}>
          Distance: <strong>{Number(myRoute.distanceKm || 0).toFixed(2)} km</strong>
        </div>
      </div>

      {routeStatus !== "in_progress" && routeStatus !== "completed" && (
        <button
          onClick={handleStartRoute}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "none",
            background: "#111",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 14,
          }}
        >
          🚚 Start Route
        </button>
      )}

      <h3 style={{ marginTop: 10 }}>🗑️ Bins to Collect</h3>

      {binDetails.length === 0 ? (
        <p style={{ color: "#666" }}>No bins found for this route.</p>
      ) : (
        <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
          {binDetails.map((b) => {
            const isCollected = Number(b.fillLevel) === 0 && !b.overflow;

            return (
              <div
                key={b.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid #ddd",
                  background: isCollected ? "#eaffea" : "#fff",
                }}
              >
                <div style={{ fontWeight: 800 }}>
                  Bin #{b.id} {isCollected ? "✅" : ""}
                </div>
                <div style={{ marginTop: 4 }}>
                  Fill: <strong>{b.fillLevel}%</strong> | Overflow:{" "}
                  <strong>{b.overflow ? "YES" : "NO"}</strong>
                </div>

                <button
                  onClick={() => handleCollectBin(b.id)}
                  disabled={routeStatus !== "in_progress" || isCollected}
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    borderRadius: 12,
                    border: "none",
                    background:
                      routeStatus !== "in_progress" || isCollected ? "#aaa" : "#0a7d35",
                    color: "#fff",
                    fontWeight: 700,
                    cursor:
                      routeStatus !== "in_progress" || isCollected ? "not-allowed" : "pointer",
                  }}
                >
                  ✅ Mark Collected
                </button>
              </div>
            );
          })}
        </div>
      )}

      {msg && (
        <div style={{ marginTop: 16, fontWeight: 700 }}>
          {msg}
        </div>
      )}
    </div>
  );
}
