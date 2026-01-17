import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { getBinIcon } from './binIcon';
import { getDriverIcon } from './driverIcon';

function FitBounds({ bins, drivers }) {
  const map = useMap();

  useEffect(() => {
    const points = [
      ...bins.map(b => [b.latitude, b.longitude]),
      ...drivers.map(d => [d.latitude, d.longitude]),
    ];

    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50] });
    }
  }, [bins, drivers, map]);

  return null;
}

function App() {
  const [bins, setBins] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [autoMsg, setAutoMsg] = useState("");

  // ✅ moving drivers positions
  const [movingDrivers, setMovingDrivers] = useState({}); // { driverId: { latitude, longitude } }

  // ✅ stores each driver's progress
  const driverProgressRef = useRef({}); 
  // { driverId: { routeIndex, stepIndex, steps, collectedBinIds:Set } }

  // ✅ LIVE bins polling
  useEffect(() => {
    let alive = true;

    const fetchBins = () => {
      fetch('http://localhost:8080/api/bins')
        .then(res => res.json())
        .then(data => {
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
    fetch('http://localhost:8080/api/drivers')
      .then(res => res.json())
      .then(data => {
        const driversWithLocation = (data || []).map((d, index) => ({
          ...d,
          latitude: d.latitude || 6.92 + index * 0.01,
          longitude: d.longitude || 79.86 + index * 0.01,
        }));
        setDrivers(driversWithLocation);
      })
      .catch(console.error);
  }, []);

  // ✅ routes fetch (reusable)
  const fetchRoutes = () => {
    fetch('http://localhost:8080/api/routes')
      .then(res => res.json())
      .then(data => setRoutes(data || []))
      .catch(console.error);
  };

  // routes initial load
  useEffect(() => {
    fetchRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // available dates
  const availableDates = useMemo(() => {
    const set = new Set();
    for (const r of routes) if (r.routeDate) set.add(r.routeDate);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [routes]);

  // default route date
  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // filtered routes
  const filteredRoutes = useMemo(() => {
    if (!selectedDate) return routes;
    return routes.filter(r => r.routeDate === selectedDate);
  }, [routes, selectedDate]);

  // alerts
  const criticalBins = useMemo(() => bins.filter(b => b.overflow || Number(b.fillLevel) >= 95), [bins]);
  const warningBins = useMemo(
    () => bins.filter(b => !b.overflow && Number(b.fillLevel) >= 80 && Number(b.fillLevel) < 95),
    [bins]
  );

  // total distance
  const totalDistanceKm = useMemo(() => {
    return filteredRoutes.reduce((sum, r) => sum + Number(r.distanceKm || 0), 0);
  }, [filteredRoutes]);

  // ✅ Auto-generate routes button
  const handleAutoGenerate = async () => {
    setAutoMsg("Generating routes...");
    try {
      const res = await fetch('http://localhost:8080/api/routes/auto-generate?threshold=80&maxStops=6', {
        method: 'POST',
      });
      const data = await res.json();
      setAutoMsg(`${data.message} | routes: ${data.routesCreated} | bins used: ${data.binsUsed}`);

      // refresh routes so they appear immediately
      fetchRoutes();

      // ✅ reset driver simulation progress when routes regenerate
      driverProgressRef.current = {};
      setMovingDrivers({});
    } catch (e) {
      console.error(e);
      setAutoMsg("Auto-generate failed. Check backend console.");
    }
  };

  // ✅ create smooth points between 2 bins
  const createStepsBetween = (start, end, stepsCount = 25) => {
    const [lat1, lng1] = start;
    const [lat2, lng2] = end;

    const steps = [];
    for (let i = 0; i <= stepsCount; i++) {
      const t = i / stepsCount;
      steps.push([
        lat1 + (lat2 - lat1) * t,
        lng1 + (lng2 - lng1) * t
      ]);
    }
    return steps;
  };

  // ✅ Build paths per driver from routes
  const driverPaths = useMemo(() => {
    const map = {}; // { driverId: [ [lat,lng], ... ] }

    for (const route of filteredRoutes) {
      const points =
        route.binIds
          ?.map(binId => {
            const bin = bins.find(b => Number(b.id) === Number(binId));
            return bin ? [bin.latitude, bin.longitude] : null;
          })
          .filter(Boolean) || [];

      if (points.length >= 2) {
        map[route.driverId] = {
          points,
          binIds: route.binIds
        };
      }
    }

    return map;
  }, [filteredRoutes, bins]);

  // ✅ NEW: when truck "reaches" a bin => COLLECT it
  const collectBin = (binId) => {
    setBins(prevBins =>
      prevBins.map(b => {
        if (Number(b.id) !== Number(binId)) return b;

        return {
          ...b,
          fillLevel: 0,
          overflow: false,
        };
      })
    );
  };

  // ✅ movement engine (every 1 second)
  useEffect(() => {
    const driverIds = Object.keys(driverPaths);
    if (driverIds.length === 0) return;

    const interval = setInterval(() => {
      setMovingDrivers(prev => {
        const updated = { ...prev };

        for (const driverIdStr of driverIds) {
          const driverId = Number(driverIdStr);

          const routeInfo = driverPaths[driverId];
          const pathPoints = routeInfo.points;
          const binIds = routeInfo.binIds;

          // init progress
          if (!driverProgressRef.current[driverId]) {
            driverProgressRef.current[driverId] = {
              routeIndex: 0,
              stepIndex: 0,
              steps: [],
              collectedBinIds: new Set(),
            };

            // start at first bin
            updated[driverId] = {
              latitude: pathPoints[0][0],
              longitude: pathPoints[0][1],
            };

            // ✅ instantly collect the first bin
            const firstBinId = binIds?.[0];
            if (firstBinId && !driverProgressRef.current[driverId].collectedBinIds.has(firstBinId)) {
              driverProgressRef.current[driverId].collectedBinIds.add(firstBinId);
              collectBin(firstBinId);
            }
          }

          const progress = driverProgressRef.current[driverId];

          // build steps if empty
          if (!progress.steps || progress.steps.length === 0) {
            const current = pathPoints[progress.routeIndex];
            const next = pathPoints[progress.routeIndex + 1];

            if (!next) {
              // route finished, stay at last point
              updated[driverId] = {
                latitude: current[0],
                longitude: current[1],
              };
              continue;
            }

            progress.steps = createStepsBetween(current, next, 25);
            progress.stepIndex = 0;
          }

          // move along steps
          const step = progress.steps[progress.stepIndex];

          updated[driverId] = {
            latitude: step[0],
            longitude: step[1],
          };

          progress.stepIndex++;

          // finished segment (reached next bin)
          if (progress.stepIndex >= progress.steps.length) {
            progress.steps = [];
            progress.stepIndex = 0;
            progress.routeIndex++;

            // ✅ collect the bin we just reached
            const reachedBinId = binIds?.[progress.routeIndex];
            if (reachedBinId && !progress.collectedBinIds.has(reachedBinId)) {
              progress.collectedBinIds.add(reachedBinId);
              collectBin(reachedBinId);
            }

            // finished whole route? loop again forever
            if (progress.routeIndex >= pathPoints.length - 1) {
              progress.routeIndex = 0;
            }
          }

          driverProgressRef.current[driverId] = progress;
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [driverPaths]);

  // ✅ drivers shown = moving position OR original
  const driversToDisplay = useMemo(() => {
    return drivers.map(d => {
      const live = movingDrivers[d.id];
      if (!live) return d;

      return {
        ...d,
        latitude: live.latitude,
        longitude: live.longitude,
      };
    });
  }, [drivers, movingDrivers]);

  return (
    <div className="layout">
      <div className="sidebar">
        <div className="sidebarTitle">⚡ Live IoT Alerts</div>

        <button className="btnPrimary" onClick={handleAutoGenerate}>
          🧠 Auto-Generate Routes (80%+)
        </button>

        {autoMsg && <div className="smallText" style={{ marginTop: 8 }}>{autoMsg}</div>}

        <div className="sidebarSection" style={{ marginTop: 14 }}>
          <div className="sidebarSectionTitle">🔴 Critical (95%+ / Overflow)</div>
          {criticalBins.length === 0 ? (
            <div className="emptyText">No critical bins right now</div>
          ) : (
            criticalBins.map(b => (
              <div key={`crit-${b.id}`} className="alertCard alertCritical">
                <div><strong>Bin #{b.id}</strong></div>
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
            warningBins.map(b => (
              <div key={`warn-${b.id}`} className="alertCard alertWarning">
                <div><strong>Bin #{b.id}</strong></div>
                <div>Fill: {b.fillLevel}%</div>
                <div>Status: Collect soon</div>
              </div>
            ))
          )}
        </div>

        <div className="sidebarSection">
          <div className="sidebarSectionTitle">🗓️ Route Filter</div>
          <select
            className="select"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            <option value="">All Dates</option>
            {availableDates.map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>

          <div className="smallText">
            Live bin refresh: <strong>every 3 seconds</strong><br />
            Showing routes: <strong>{selectedDate || "All Dates"}</strong><br />
            Routes displayed: <strong>{filteredRoutes.length}</strong><br />
            ✅ Total distance: <strong>{totalDistanceKm.toFixed(2)} km</strong><br />
            🚚 Moving drivers: <strong>{Object.keys(driverPaths).length}</strong>
          </div>
        </div>
      </div>

      <div className="mapWrap">
        <MapContainer center={[6.9271, 79.8612]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds bins={bins} drivers={driversToDisplay} />

          {/* bins */}
          {bins.map(bin => (
            <Marker
              key={`bin-${bin.id}`}
              position={[bin.latitude, bin.longitude]}
              icon={getBinIcon(bin.fillLevel)}
            >
              <Popup>
                <strong>Bin ID:</strong> {bin.id}<br />
                <strong>Fill Level:</strong> {bin.fillLevel}%<br />
                <strong>Overflow:</strong> {bin.overflow ? "YES" : "NO"}<br />
                {Number(bin.fillLevel) === 0 ? (
                  <div style={{ marginTop: 6 }}>✅ <strong>Collected</strong></div>
                ) : null}
              </Popup>
            </Marker>
          ))}

          {/* drivers */}
          {driversToDisplay.map(driver => (
            <Marker
              key={`driver-${driver.id}`}
              position={[driver.latitude, driver.longitude]}
              icon={getDriverIcon(driver.available)}
            >
              <Popup>
                🚚 <strong>Driver:</strong> {driver.name}<br />
                <strong>Vehicle:</strong> {driver.vehicleNumber}<br />
                <strong>Status:</strong> {driver.available ? 'Available' : 'Unavailable'}<br />
                {driverPaths[driver.id] ? (
                  <div style={{ marginTop: 6 }}>
                    ✅ <strong>Following Route</strong>
                  </div>
                ) : (
                  <div style={{ marginTop: 6 }}>
                    ❌ <strong>No Route Today</strong>
                  </div>
                )}
              </Popup>
            </Marker>
          ))}

          {/* routes */}
          {filteredRoutes.map(route => {
            const points =
              route.binIds
                ?.map(binId => {
                  const bin = bins.find(b => Number(b.id) === Number(binId));
                  return bin ? [bin.latitude, bin.longitude] : null;
                })
                .filter(Boolean) || [];

            if (points.length < 2) return null;

            return (
              <Polyline key={`route-${route.id}`} positions={points} color="blue" weight={8} opacity={0.9}>
                <Popup>
                  🛣️ <strong>Route ID:</strong> {route.id}<br />
                  👤 <strong>Driver ID:</strong> {route.driverId}<br />
                  📅 <strong>Date:</strong> {route.routeDate}<br />
                  ✅ <strong>Status:</strong> {route.status}<br />
                  📏 <strong>Distance:</strong> {Number(route.distanceKm || 0).toFixed(2)} km<br />
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

export default App;
