// frontend/src/pages/Dashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { getBinIcon } from "../binIcon";
import { getDriverIcon } from "../driverIcon";

function FitBounds({ bins, drivers }) {
  const map = useMap();

  useEffect(() => {
    const points = [
      ...bins.map((b) => [b.latitude, b.longitude]),
      ...drivers.map((d) => [d.latitude, d.longitude]),
    ];

    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50] });
    }
  }, [bins, drivers, map]);

  return null;
}

export default function Dashboard() {
  const [bins, setBins] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [autoMsg, setAutoMsg] = useState("");

  const [isCollecting, setIsCollecting] = useState(false);

  const [movingDrivers, setMovingDrivers] = useState({});
  const driverProgressRef = useRef({});

  // ✅ LIVE bins polling
  useEffect(() => {
    let alive = true;

    const fetchBins = () => {
      fetch("http://localhost:8080/api/bins")
        .then((res) => res.json())
        .then((data) => {
          if (!alive) return;
          setBins(data || []);
        })
        .catch(console.error);
    };

    fetchBins();
    const interval = setInterval(fetchBins, 3000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  // ✅ drivers
  useEffect(() => {
    fetch("http://localhost:8080/api/drivers")
      .then((res) => res.json())
      .then((data) => {
        const driversWithLocation = (data || []).map((d, index) => ({
          ...d,
          latitude: d.latitude || 6.92 + index * 0.01,
          longitude: d.longitude || 79.86 + index * 0.01,
        }));
        setDrivers(driversWithLocation);
      })
      .catch(console.error);
  }, []);

  const fetchRoutes = () => {
    return fetch("http://localhost:8080/api/routes")
      .then((res) => res.json())
      .then((data) => setRoutes(data || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableDates = useMemo(() => {
    const set = new Set();
    for (const r of routes) if (r.routeDate) set.add(r.routeDate);
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
    const status = String(statusRaw || "").toLowerCase();
    if (status === "completed") return "green";
    if (status === "in_progress") return "orange";
    return "blue";
  };

  const getPrettyStatus = (statusRaw) => {
    const status = String(statusRaw || "").toLowerCase();
    if (status === "completed") return "COMPLETED ✅";
    if (status === "in_progress") return "IN_PROGRESS 🚚";
    if (status === "assigned") return "ASSIGNED 📌";
    if (status === "pending") return "ASSIGNED 📌";
    return statusRaw;
  };

  // ✅ Auto-generate routes button
  // FIX: always set selectedDate to the date we generated for
  const handleAutoGenerate = async () => {
    setAutoMsg("Generating routes...");

    try {
      const dateToUse = selectedDate && selectedDate.trim() ? selectedDate.trim() : null;

      const url =
        "http://localhost:8080/api/routes/auto-generate?threshold=80&maxStops=6" +
        (dateToUse ? `&date=${encodeURIComponent(dateToUse)}` : "");

      const res = await fetch(url, { method: "POST" });
      const data = await res.json();

      setAutoMsg(`${data.message} | routes: ${data.routesCreated} | bins used: ${data.binsUsed}`);

      // ✅ important: switch filter to the generated date
      if (data.routeDate) setSelectedDate(data.routeDate);

      await fetchRoutes();

      setIsCollecting(false);
      driverProgressRef.current = {};
      setMovingDrivers({});
    } catch (e) {
      console.error(e);
      setAutoMsg("Auto-generate failed. Check backend console.");
    }
  };

  const handleStartCollecting = async () => {
    try {
      setAutoMsg("Starting collecting...");

      await fetchRoutes();

      const targets = filteredRoutes.filter((r) => {
        const s = String(r.status || "").toLowerCase();
        return s !== "completed";
      });

      for (const r of targets) {
        await fetch(`http://localhost:8080/api/routes/${r.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "in_progress" }),
        });
      }

      await fetchRoutes();

      setIsCollecting(true);
      driverProgressRef.current = {};
      setMovingDrivers({});

      setAutoMsg("Collecting started ✅");
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

  // ✅ Build paths per driver ONLY from IN_PROGRESS routes
  const driverPaths = useMemo(() => {
    const map = {};

    for (const route of filteredRoutes) {
      const status = String(route.status || "").toLowerCase();
      if (status !== "in_progress") continue;

      const points =
        route.binIds
          ?.map((binId) => {
            const bin = bins.find((b) => Number(b.id) === Number(binId));
            return bin ? [bin.latitude, bin.longitude] : null;
          })
          .filter(Boolean) || [];

      if (points.length >= 1) {
        map[route.driverId] = {
          points,
          binIds: route.binIds,
          routeId: route.id,
        };
      }
    }

    return map;
  }, [filteredRoutes, bins]);

  const collectBinBackend = async (binId) => {
    try {
      await fetch(`http://localhost:8080/api/bins/${binId}/collect`, {
        method: "PATCH",
      });
    } catch (e) {
      console.error("Collect bin failed:", e);
    }
  };

  // ✅ movement engine
  useEffect(() => {
    if (!isCollecting) return;

    const driverIds = Object.keys(driverPaths);
    if (driverIds.length === 0) return;

    const interval = setInterval(() => {
      setMovingDrivers((prev) => {
        const updated = { ...prev };

        for (const driverIdStr of driverIds) {
          const driverId = Number(driverIdStr);

          const routeInfo = driverPaths[driverId];
          const pathPoints = routeInfo.points;
          const binIds = routeInfo.binIds;
          const routeId = routeInfo.routeId;

          if (!driverProgressRef.current[driverId]) {
            driverProgressRef.current[driverId] = {
              routeIndex: 0,
              stepIndex: 0,
              steps: [],
              collectedBinIds: new Set(),
              completed: false,
              routeId,
            };

            updated[driverId] = {
              latitude: pathPoints[0][0],
              longitude: pathPoints[0][1],
            };
          }

          const progress = driverProgressRef.current[driverId];
          if (progress.completed) continue;

          // if route has only 1 bin, instantly complete
          if (pathPoints.length === 1) {
            const onlyBinId = binIds?.[0];
            if (onlyBinId && !progress.collectedBinIds.has(onlyBinId)) {
              progress.collectedBinIds.add(onlyBinId);
              collectBinBackend(onlyBinId);
            }

            progress.completed = true;

            fetch(`http://localhost:8080/api/routes/${routeId}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "completed" }),
            }).then(() => fetchRoutes());

            driverProgressRef.current[driverId] = progress;
            continue;
          }

          if (!progress.steps || progress.steps.length === 0) {
            const current = pathPoints[progress.routeIndex];
            const next = pathPoints[progress.routeIndex + 1];

            if (!next) {
              updated[driverId] = { latitude: current[0], longitude: current[1] };
              progress.completed = true;
              driverProgressRef.current[driverId] = progress;
              continue;
            }

            progress.steps = createStepsBetween(current, next, 25);
            progress.stepIndex = 0;
          }

          const step = progress.steps[progress.stepIndex];
          updated[driverId] = { latitude: step[0], longitude: step[1] };
          progress.stepIndex++;

          if (progress.stepIndex >= progress.steps.length) {
            progress.steps = [];
            progress.stepIndex = 0;
            progress.routeIndex++;

            const reachedBinId = binIds?.[progress.routeIndex];
            if (reachedBinId && !progress.collectedBinIds.has(reachedBinId)) {
              progress.collectedBinIds.add(reachedBinId);
              collectBinBackend(reachedBinId);
            }

            if (progress.routeIndex >= pathPoints.length - 1) {
              progress.completed = true;

              fetch(`http://localhost:8080/api/routes/${routeId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "completed" }),
              }).then(() => fetchRoutes());

              driverProgressRef.current[driverId] = progress;
              continue;
            }
          }

          driverProgressRef.current[driverId] = progress;
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [driverPaths, isCollecting]);

  const driversToDisplay = useMemo(() => {
    return drivers.map((d) => {
      const live = movingDrivers[d.id];
      if (!live) return d;

      return {
        ...d,
        latitude: live.latitude,
        longitude: live.longitude,
      };
    });
  }, [drivers, movingDrivers]);

  // ✅ helper to get a driver’s current position
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
          🧠 Auto-Generate Routes (80%+)
        </button>

        <button
          className="btnPrimary"
          style={{ marginTop: 10, background: isCollecting ? "#999" : undefined }}
          onClick={handleStartCollecting}
          disabled={isCollecting}
        >
          🚚 Start Collecting
        </button>

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
            <option value="">All Dates</option>
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>

          <div className="smallText">
            Live bin refresh: <strong>every 3 seconds</strong>
            <br />
            Showing routes: <strong>{selectedDate || "All Dates"}</strong>
            <br />
            Routes displayed: <strong>{filteredRoutes.length}</strong>
            <br />
            ✅ Total distance: <strong>{totalDistanceKm.toFixed(2)} km</strong>
            <br />
            🚚 Collecting running: <strong>{isCollecting ? "YES" : "NO"}</strong>
          </div>
        </div>
      </div>

      <div className="mapWrap">
        <MapContainer center={[6.9271, 79.8612]} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <FitBounds bins={bins} drivers={driversToDisplay} />

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

          {/* drivers */}
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

            // ✅ FIX: if only 1 bin => draw line from driver -> bin
            let points = binPoints;
            if (binPoints.length === 1) {
              const driverPos = getDriverPosition(route.driverId);
              if (driverPos) points = [driverPos, binPoints[0]];
            }

            if (points.length < 2) return null;

            const color = getRouteColor(route.status);

            return (
              <Polyline key={`route-${route.id}`} positions={points} color={color} weight={7} opacity={0.9}>
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
