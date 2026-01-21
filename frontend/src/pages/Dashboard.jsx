import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { getBinIcon } from "../binIcon";
import { getDriverIcon } from "../driverIcon";
import HeatLayer from "../components/HeatLayer";

const API = "http://localhost:8080";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function FitBoundsOnce({ bins, drivers }) {
  const map = useMap();
  const didFitRef = useRef(false);

  useEffect(() => {
    if (didFitRef.current) return;

    const points = [
      ...bins.map((b) => [b.latitude, b.longitude]),
      ...drivers.map((d) => [d.latitude, d.longitude]),
    ];

    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50] });
      didFitRef.current = true;
    }
  }, [bins, drivers, map]);

  return null;
}

export default function Dashboard() {
  const [bins, setBins] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [autoMsg, setAutoMsg] = useState("");

  // Demo simulation
  const [demoMode, setDemoMode] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);

  const [movingDrivers, setMovingDrivers] = useState({});
  const driverProgressRef = useRef({});
  const collectingPlanRef = useRef({});

  // ✅ Heatmap (REAL TIME, yellow/red ONLY)
  const [heatmapOn, setHeatmapOn] = useState(false);
  const [heatPoints, setHeatPoints] = useState([]);

  const fetchBinsNow = async () => {
    const res = await fetch(`${API}/api/bins`);
    const data = await res.json();
    setBins(data || []);
    return data || [];
  };

  // ✅ Fetch heatmap from backend (backend returns only fill>=80 or overflow)
  const fetchHeatmap = async () => {
    try {
      const res = await fetch(`${API}/api/heatmap/bins`);
      const data = await res.json();

      // Real-time: only yellow/red bins should be returned already.
      // But we also double-filter here for safety.
      const pts = (data || [])
        .map((row) => {
          const lat = Number(row.latitude);
          const lng = Number(row.longitude);
          const fill = Number(row.fill_level ?? row.fillLevel ?? 0);
          const overflow = Boolean(row.overflow);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          // ✅ Only show yellow/red
          if (!overflow && fill < 80) return null;

          const intensity = Math.min(1, Math.max(0, fill / 100));
          return [lat, lng, intensity];
        })
        .filter(Boolean);

      setHeatPoints(pts);
    } catch (e) {
      console.error(e);
      setHeatPoints([]);
    }
  };

  // ✅ LIVE bins polling every 3 seconds + sync heatmap (real time)
  useEffect(() => {
    let alive = true;

    const fetchBins = async () => {
      try {
        const res = await fetch(`${API}/api/bins`);
        const data = await res.json();
        if (!alive) return;
        setBins(data || []);

        // ✅ When heatmap ON, refresh heatmap at SAME RATE (real time)
        if (heatmapOn) {
          fetchHeatmap();
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchBins();
    const interval = setInterval(fetchBins, 3000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [heatmapOn]);

  // ✅ drivers (keeps your trucks)
  useEffect(() => {
    fetch(`${API}/api/drivers`)
      .then((res) => res.json())
      .then((data) => {
        // ✅ fallback locations so trucks always appear even if DB has null lat/lng
        const driversWithLocation = (data || []).map((d, index) => ({
          ...d,
          latitude: d.latitude || 6.92 + index * 0.01,
          longitude: d.longitude || 79.86 + index * 0.01,
        }));
        setDrivers(driversWithLocation);
      })
      .catch(console.error);
  }, []);

  const fetchRoutes = async (dateStr) => {
    const dateToUse = dateStr || selectedDate || todayISO();
    const res = await fetch(`${API}/api/routes?date=${encodeURIComponent(dateToUse)}`);
    const data = await res.json();
    setRoutes(data || []);
    return data || [];
  };

  useEffect(() => {
    fetchRoutes(todayISO());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRoutes(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const availableDates = useMemo(() => {
    const set = new Set();
    for (const r of routes) if (r.routeDate) set.add(r.routeDate);
    set.add(todayISO());
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [routes]);

  const filteredRoutes = routes;

  const criticalBins = useMemo(
    () => bins.filter((b) => b.overflow || Number(b.fillLevel) >= 95),
    [bins]
  );

  const warningBins = useMemo(
    () => bins.filter((b) => !b.overflow && Number(b.fillLevel) >= 80 && Number(b.fillLevel) < 95),
    [bins]
  );

  const totalDistanceKm = useMemo(() => {
    return filteredRoutes.reduce((sum, r) => sum + Number(r.distanceKm || 0), 0);
  }, [filteredRoutes]);

  const getRouteColor = (statusRaw) => {
    const status = String(statusRaw || "").trim().toLowerCase();
    if (status === "completed") return "green";
    if (status === "in_progress") return "orange";
    return "blue";
  };

  const getPrettyStatus = (statusRaw) => {
    const status = String(statusRaw || "").trim().toLowerCase();
    if (status === "completed") return "COMPLETED ✅";
    if (status === "in_progress") return "IN_PROGRESS 🚚";
    if (status === "assigned") return "ASSIGNED 📌";
    if (status === "pending") return "ASSIGNED 📌";
    return statusRaw;
  };

  const resetSimulation = (msg) => {
    setIsCollecting(false);
    setMovingDrivers({});
    driverProgressRef.current = {};
    collectingPlanRef.current = {};
    if (msg) setAutoMsg(msg);
  };

  const handleAutoGenerate = async () => {
    setAutoMsg("Generating routes for today...");

    try {
      const today = todayISO();
      const url = `${API}/api/routes/auto-generate?threshold=80&maxStops=6&date=${encodeURIComponent(today)}`;

      const res = await fetch(url, { method: "POST" });
      const data = await res.json();

      setAutoMsg(`${data.message} | routes: ${data.routesCreated} | bins used: ${data.binsUsed}`);
      setSelectedDate(today);

      await fetchRoutes(today);

      resetSimulation("");
    } catch (e) {
      console.error(e);
      setAutoMsg("Auto-generate failed. Check backend console.");
    }
  };

  const handleStartCollecting = async () => {
    try {
      const date = selectedDate || todayISO();
      setAutoMsg("Starting collecting...");

      await fetch(`${API}/api/routes/start-collecting?date=${encodeURIComponent(date)}`, {
        method: "POST",
      });

      const latestBins = await fetchBinsNow();
      const updatedRoutes = await fetchRoutes(date);

      const anyInProgress = updatedRoutes.some(
        (r) => String(r.status || "").trim().toLowerCase() === "in_progress"
      );

      if (!anyInProgress) {
        resetSimulation("⚠️ No routes are IN_PROGRESS (already completed / none exist).");
        return;
      }

      if (!demoMode) {
        resetSimulation("✅ Collecting started (Demo Mode OFF). Driver portal controls collection.");
        return;
      }

      const plan = {};
      for (const route of updatedRoutes) {
        const status = String(route.status || "").trim().toLowerCase();
        if (status !== "in_progress") continue;

        const points =
          route.binIds
            ?.map((binId) => {
              const bin = latestBins.find((b) => Number(b.id) === Number(binId));
              return bin ? [bin.latitude, bin.longitude] : null;
            })
            .filter(Boolean) || [];

        if (points.length >= 1) {
          plan[route.driverId] = {
            routeId: route.id,
            binIds: route.binIds,
            points,
          };
        }
      }

      collectingPlanRef.current = plan;

      if (Object.keys(plan).length === 0) {
        resetSimulation("⚠️ IN_PROGRESS routes exist but no valid bin coords (plan empty).");
        return;
      }

      setIsCollecting(true);
      driverProgressRef.current = {};
      setMovingDrivers({});
      setAutoMsg("Collecting started ✅ (Demo Mode ON)");
    } catch (e) {
      console.error(e);
      setAutoMsg("Start collecting failed ❌ (check backend logs)");
    }
  };

  const createStepsBetween = (start, end, stepsCount = 25) => {
    const [lat1, lng1] = start;
    const [lat2, lng2] = end;

    const steps = [];
    for (let i = 0; i <= stepsCount; i++) {
      const t = i / stepsCount;
      steps.push([lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t]);
    }
    return steps;
  };

  const collectBinBackend = async (routeId, binId) => {
    try {
      await fetch(`${API}/api/routes/${routeId}/collect-bin/${binId}`, { method: "POST" });
    } catch (e) {
      console.error("Collect bin failed:", e);
    }
  };

  // ✅ movement engine (demo)
  useEffect(() => {
    if (!isCollecting || !demoMode) return;

    const plan = collectingPlanRef.current;
    const driverIds = Object.keys(plan);
    if (driverIds.length === 0) return;

    const interval = setInterval(() => {
      setMovingDrivers((prev) => {
        const updated = { ...prev };

        for (const driverIdStr of driverIds) {
          const driverId = Number(driverIdStr);
          const routeInfo = plan[driverId];
          if (!routeInfo) continue;

          const { routeId, binIds, points } = routeInfo;

          if (!driverProgressRef.current[driverId]) {
            const driverObj = drivers.find((d) => Number(d.id) === Number(driverId));
            const startLat = driverObj?.latitude ?? points[0][0];
            const startLng = driverObj?.longitude ?? points[0][1];

            driverProgressRef.current[driverId] = {
              targetIndex: 0,
              stepIndex: 0,
              steps: [],
              collectedBinIds: new Set(),
              completed: false,
              routeId,
            };

            updated[driverId] = { latitude: startLat, longitude: startLng };
          }

          const progress = driverProgressRef.current[driverId];
          if (progress.completed) continue;

          // 1-bin route
          if (points.length === 1) {
            const onlyBinId = binIds?.[0];
            if (onlyBinId && !progress.collectedBinIds.has(onlyBinId)) {
              progress.collectedBinIds.add(onlyBinId);
              collectBinBackend(routeId, onlyBinId);
            }
            progress.completed = true;
            driverProgressRef.current[driverId] = progress;
            continue;
          }

          const currentLive = updated[driverId] || prev[driverId];
          const curPos = currentLive
            ? [currentLive.latitude, currentLive.longitude]
            : [points[0][0], points[0][1]];

          const target = points[progress.targetIndex];
          if (!target) {
            progress.completed = true;
            driverProgressRef.current[driverId] = progress;
            continue;
          }

          if (!progress.steps || progress.steps.length === 0) {
            progress.steps = createStepsBetween(curPos, target, 25);
            progress.stepIndex = 0;
          }

          const step = progress.steps[progress.stepIndex];
          updated[driverId] = { latitude: step[0], longitude: step[1] };
          progress.stepIndex++;

          if (progress.stepIndex >= progress.steps.length) {
            progress.steps = [];
            progress.stepIndex = 0;

            const reachedBinId = binIds?.[progress.targetIndex];
            if (reachedBinId && !progress.collectedBinIds.has(reachedBinId)) {
              progress.collectedBinIds.add(reachedBinId);
              collectBinBackend(routeId, reachedBinId);
            }

            progress.targetIndex++;
            if (progress.targetIndex >= points.length) {
              progress.completed = true;
            }
          }

          driverProgressRef.current[driverId] = progress;
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isCollecting, demoMode, drivers]);

  // refresh routes while collecting
  useEffect(() => {
    if (!isCollecting) return;

    const interval = setInterval(() => {
      fetchRoutes(selectedDate);
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCollecting, selectedDate]);

  // stop when no in_progress
  useEffect(() => {
    if (!isCollecting) return;

    const anyInProgress = filteredRoutes.some(
      (r) => String(r.status || "").trim().toLowerCase() === "in_progress"
    );

    if (!anyInProgress) {
      resetSimulation("All routes completed ✅");
    }
  }, [filteredRoutes, isCollecting]);

  const driversToDisplay = useMemo(() => {
    return drivers.map((d) => {
      const live = movingDrivers[d.id];
      if (!live) return d;
      return { ...d, latitude: live.latitude, longitude: live.longitude };
    });
  }, [drivers, movingDrivers]);

  // used for 1-bin polyline
  const getDriverPosition = (driverId) => {
    const live = movingDrivers[driverId];
    if (live) return [live.latitude, live.longitude];

    const d = driversToDisplay.find((x) => Number(x.id) === Number(driverId));
    if (!d) return null;

    return [d.latitude, d.longitude];
  };

  return (
    <div className="layout">
      <div className="sidebar">
        <div className="sidebarTitle">⚡ Live IoT Alerts</div>

        <button className="btnPrimary" onClick={handleAutoGenerate}>
          🧠 Auto-Generate Routes (TODAY, 80%+)
        </button>

        <button
          className="btnPrimary"
          style={{ marginTop: 10, background: isCollecting ? "#999" : undefined }}
          onClick={handleStartCollecting}
          disabled={isCollecting}
        >
          🚚 Start Collecting
        </button>

        <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "#f3f3f3" }}>
          <div style={{ fontWeight: 800 }}>🎬 Demo Mode (Simulation)</div>
          <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => {
                const on = e.target.checked;
                setDemoMode(on);
                if (!on) resetSimulation("Demo Mode OFF ✅ (Driver portal controls collection)");
              }}
            />
            <span style={{ fontWeight: 700 }}>
              {demoMode ? "ON (Dashboard moves trucks)" : "OFF (Driver portal only)"}
            </span>
          </label>
        </div>

        {/* ✅ Heatmap Toggle (REAL-TIME, yellow/red only) */}
        <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "#f3f3f3" }}>
          <div style={{ fontWeight: 800 }}>🔥 Heatmap View (Real-time)</div>

          <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
            <input
              type="checkbox"
              checked={heatmapOn}
              onChange={(e) => {
                const on = e.target.checked;
                setHeatmapOn(on);
                if (on) fetchHeatmap();
                if (!on) setHeatPoints([]);
              }}
            />
            <span style={{ fontWeight: 700 }}>{heatmapOn ? "ON (yellow/red only)" : "OFF"}</span>
          </label>

          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
            Updates every 3 seconds. Green bins never show heat.
          </div>
        </div>

        {autoMsg && (
          <div className="smallText" style={{ marginTop: 8 }}>
            {autoMsg}
          </div>
        )}

        <div className="sidebarSection" style={{ marginTop: 14 }}>
          <div className="sidebarSectionTitle">🔴 Critical (95%+ / Overflow)</div>
          {criticalBins.length === 0 ? (
            <div className="emptyText">No critical bins right now</div>
          ) : (
            criticalBins.map((b) => (
              <div key={`crit-${b.id}`} className="alertCard alertCritical">
                <div>
                  <strong>Bin #{b.id}</strong>
                </div>
                <div>Fill: {b.fillLevel}%</div>
                <div>Status: OVERFLOW</div>
              </div>
            ))
          )}
        </div>

        <div className="sidebarSection">
          <div className="sidebarSectionTitle">🟠 Warning (80%+)</div>
          {warningBins.length === 0 ? (
            <div className="emptyText">No warning bins right now</div>
          ) : (
            warningBins.map((b) => (
              <div key={`warn-${b.id}`} className="alertCard alertWarning">
                <div>
                  <strong>Bin #{b.id}</strong>
                </div>
                <div>Fill: {b.fillLevel}%</div>
                <div>Status: Collect soon</div>
              </div>
            ))
          )}
        </div>

        <div className="sidebarSection">
          <div className="sidebarSectionTitle">🗓️ Route Filter</div>
          <select className="select" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {date === todayISO() ? `${date} (Today)` : date}
              </option>
            ))}
          </select>

          <div className="smallText">
            Live bin refresh: <strong>every 3 seconds</strong>
            <br />
            Showing routes: <strong>{selectedDate}</strong>
            <br />
            Routes displayed: <strong>{filteredRoutes.length}</strong>
            <br />
            ✅ Total distance: <strong>{totalDistanceKm.toFixed(2)} km</strong>
            <br />
            🚚 Collecting running: <strong>{isCollecting ? "YES" : "NO"}</strong>
            <br />
            🎬 Demo Mode: <strong>{demoMode ? "ON" : "OFF"}</strong>
            <br />
            🔥 Heatmap: <strong>{heatmapOn ? "ON" : "OFF"}</strong>
          </div>
        </div>
      </div>

      <div className="mapWrap">
        <MapContainer center={[6.9271, 79.8612]} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <FitBoundsOnce bins={bins} drivers={driversToDisplay} />

          {/* ✅ Heatmap */}
          <HeatLayer points={heatPoints} enabled={heatmapOn} />

          {/* bins */}
          {bins.map((bin) => (
            <Marker key={`bin-${bin.id}`} position={[bin.latitude, bin.longitude]} icon={getBinIcon(bin.fillLevel)}>
              <Popup>
                <strong>Bin ID:</strong> {bin.id}
                <br />
                <strong>Fill Level:</strong> {bin.fillLevel}%
                <br />
                <strong>Overflow:</strong> {bin.overflow ? "YES" : "NO"}
              </Popup>
            </Marker>
          ))}

          {/* drivers (trucks) */}
          {driversToDisplay.map((driver) => (
            <Marker key={`driver-${driver.id}`} position={[driver.latitude, driver.longitude]} icon={getDriverIcon(driver.available)}>
              <Popup>
                🚚 <strong>Driver:</strong> {driver.name}
                <br />
                <strong>Vehicle:</strong> {driver.vehicleNumber}
                <br />
                <strong>Status:</strong> {driver.available ? "Available" : "Unavailable"}
              </Popup>
            </Marker>
          ))}

          {/* routes */}
          {filteredRoutes.map((route) => {
            const binPoints =
              route.binIds
                ?.map((binId) => {
                  const bin = bins.find((b) => Number(b.id) === Number(binId));
                  return bin ? [bin.latitude, bin.longitude] : null;
                })
                .filter(Boolean) || [];

            // 1-bin route -> draw driver -> bin
            let points = binPoints;
            if (binPoints.length === 1) {
              const driverPos = getDriverPosition(route.driverId);
              if (driverPos) points = [driverPos, binPoints[0]];
            }

            if (points.length < 2) return null;

            const color = getRouteColor(route.status);

            return (
              <Polyline
                key={`route-${route.id}-${String(route.status || "").trim().toLowerCase()}`}
                positions={points}
                color={color}
                weight={7}
                opacity={0.9}
              >
                <Popup>
                  🛣️ <strong>Route ID:</strong> {route.id}
                  <br />
                  👤 <strong>Driver ID:</strong> {route.driverId}
                  <br />
                  📅 <strong>Date:</strong> {route.routeDate}
                  <br />
                  ✅ <strong>Status:</strong> {getPrettyStatus(route.status)}
                  <br />
                  📏 <strong>Distance:</strong> {Number(route.distanceKm || 0).toFixed(2)} km
                  <br />
                  🗑️ <strong>Bins:</strong> {route.binIds?.join(", ")}
                </Popup>
              </Polyline>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
