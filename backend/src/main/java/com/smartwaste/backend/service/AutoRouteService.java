package com.smartwaste.backend.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AutoRouteService {

    private final JdbcTemplate jdbc;

    public AutoRouteService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static class BinPoint {
        long id;
        double lat;
        double lng;
        int fill;
        boolean overflow;

        BinPoint(long id, double lat, double lng, int fill, boolean overflow) {
            this.id = id;
            this.lat = lat;
            this.lng = lng;
            this.fill = fill;
            this.overflow = overflow;
        }
    }

    private static class DriverRow {
        long id;
        double lat;
        double lng;

        DriverRow(long id, double lat, double lng) {
            this.id = id;
            this.lat = lat;
            this.lng = lng;
        }
    }

    private static class DriverState {
        long driverId;
        double curLat;
        double curLng;
        int stops;

        DriverState(long driverId, double curLat, double curLng) {
            this.driverId = driverId;
            this.curLat = curLat;
            this.curLng = curLng;
            this.stops = 0;
        }
    }

    @Transactional
    public Map<String, Object> generateRoutes(LocalDate routeDate, int threshold, int maxStopsPerRoute) {

        // ✅ 0) Clear existing routes for that date (prevents duplicates)
        clearRoutesForDate(routeDate);

        // ✅ 1) Pick ONLY bins that need collection (NO green bins)
        // Priority: overflow first, then highest fill
        List<BinPoint> bins = jdbc.query(
                "SELECT id, latitude, longitude, fill_level, overflow " +
                        "FROM bin " +
                        "WHERE fill_level >= ? OR overflow = true " +
                        "ORDER BY overflow DESC, fill_level DESC",
                (rs, rowNum) -> new BinPoint(
                        rs.getLong("id"),
                        rs.getDouble("latitude"),
                        rs.getDouble("longitude"),
                        rs.getInt("fill_level"),
                        rs.getBoolean("overflow")
                ),
                threshold
        );

        // ✅ 2) Available drivers WITH location (so we can assign nearest)
        List<DriverRow> drivers = jdbc.query(
                "SELECT id, latitude, longitude FROM driver WHERE available = true ORDER BY id",
                (rs, rowNum) -> new DriverRow(
                        rs.getLong("id"),
                        rs.getDouble("latitude"),
                        rs.getDouble("longitude")
                )
        );

        if (bins.isEmpty()) {
            return Map.of(
                    "message", "No bins above threshold / overflow. Nothing to route.",
                    "routesCreated", 0,
                    "binsUsed", 0,
                    "routeDate", routeDate.toString()
            );
        }

        if (drivers.isEmpty()) {
            return Map.of(
                    "message", "No available drivers. Cannot generate routes.",
                    "routesCreated", 0,
                    "binsUsed", 0,
                    "routeDate", routeDate.toString()
            );
        }

        // ✅ 3) Assign each bin to the NEAREST driver (fuel/time saving)
        Map<Long, List<BinPoint>> assignment = new LinkedHashMap<>();
        Map<Long, DriverState> driverState = new LinkedHashMap<>();

        for (DriverRow d : drivers) {
            assignment.put(d.id, new ArrayList<>());
            driverState.put(d.id, new DriverState(d.id, d.lat, d.lng));
        }

        int binsUsed = 0;

        for (BinPoint b : bins) {
            Long bestDriverId = null;
            double bestDistance = Double.MAX_VALUE;

            for (DriverState st : driverState.values()) {
                if (st.stops >= maxStopsPerRoute) continue; // capacity reached

                double dist = haversine(st.curLat, st.curLng, b.lat, b.lng);
                if (dist < bestDistance) {
                    bestDistance = dist;
                    bestDriverId = st.driverId;
                }
            }

            if (bestDriverId == null) {
                // all drivers are full (maxStops reached)
                continue;
            }

            assignment.get(bestDriverId).add(b);

            // ✅ update driver's "current position" to this bin,
            // so next assignments naturally become a nearby cluster
            DriverState st = driverState.get(bestDriverId);
            st.curLat = b.lat;
            st.curLng = b.lng;
            st.stops++;

            binsUsed++;
        }

        // remove empty driver assignments
        assignment = assignment.entrySet().stream()
                .filter(e -> !e.getValue().isEmpty())
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));

        int routesCreated = 0;

        // ✅ 4) Insert routes + ordered bins (nearest neighbor ordering per driver)
        for (DriverRow d : drivers) {
            List<BinPoint> assignedBins = assignment.get(d.id);
            if (assignedBins == null || assignedBins.isEmpty()) continue;

            // Order bins to reduce distance:
            List<BinPoint> ordered = nearestNeighborOrderFromStart(assignedBins, d.lat, d.lng);

            // ✅ IMPORTANT: status is ASSIGNED (blue in UI until Start Collecting)
            Long routeId = insertRouteAndReturnId(d.id, routeDate, "assigned");

            for (BinPoint bp : ordered) {
                jdbc.update(
                        "INSERT INTO collection_route_bins (route_id, bin_id) VALUES (?, ?)",
                        routeId, bp.id
                );
            }

            routesCreated++;
        }

        return Map.of(
                "message", "Auto-routes generated successfully! (replaced routes for " + routeDate + ")",
                "routesCreated", routesCreated,
                "binsUsed", binsUsed,
                "routeDate", routeDate.toString(),
                "threshold", threshold,
                "maxStopsPerRoute", maxStopsPerRoute
        );
    }

    // ✅ Deletes routes + junction rows for that date
    private void clearRoutesForDate(LocalDate routeDate) {
        // 1) delete junction rows first
        jdbc.update(
                "DELETE FROM collection_route_bins crb " +
                        "USING collection_route cr " +
                        "WHERE crb.route_id = cr.id AND cr.route_date = ?",
                Date.valueOf(routeDate)
        );

        // 2) delete routes
        jdbc.update(
                "DELETE FROM collection_route WHERE route_date = ?",
                Date.valueOf(routeDate)
        );
    }

    private Long insertRouteAndReturnId(long driverId, LocalDate routeDate, String status) {
        return jdbc.queryForObject(
                "INSERT INTO collection_route (created_at, status, driver_id, route_date) " +
                        "VALUES (NOW(), ?, ?, ?) RETURNING id",
                Long.class,
                status,
                driverId,
                Date.valueOf(routeDate)
        );
    }

    // ✅ Order bins using nearest neighbor, starting from driver's current location
    private List<BinPoint> nearestNeighborOrderFromStart(List<BinPoint> bins, double startLat, double startLng) {
        if (bins.size() <= 2) return bins;

        List<BinPoint> remaining = new ArrayList<>(bins);
        List<BinPoint> ordered = new ArrayList<>();

        double curLat = startLat;
        double curLng = startLng;

        while (!remaining.isEmpty()) {
            BinPoint next = null;
            double best = Double.MAX_VALUE;

            for (BinPoint candidate : remaining) {
                double dist = haversine(curLat, curLng, candidate.lat, candidate.lng);
                if (dist < best) {
                    best = dist;
                    next = candidate;
                }
            }

            ordered.add(next);
            remaining.remove(next);

            curLat = next.lat;
            curLng = next.lng;
        }

        return ordered;
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000; // meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
