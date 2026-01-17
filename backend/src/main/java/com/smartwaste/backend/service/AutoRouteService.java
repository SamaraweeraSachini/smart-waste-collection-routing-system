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

        BinPoint(long id, double lat, double lng, int fill) {
            this.id = id;
            this.lat = lat;
            this.lng = lng;
            this.fill = fill;
        }
    }

    private static class DriverRow {
        long id;
        DriverRow(long id) { this.id = id; }
    }

    @Transactional
    public Map<String, Object> generateRoutes(LocalDate routeDate, int threshold, int maxStopsPerRoute) {

        // ✅ 0) Clear existing routes for that date (prevents duplicates)
        clearRoutesForDate(routeDate);

        // 1) bins that need collection
        List<BinPoint> bins = jdbc.query(
                "SELECT id, latitude, longitude, fill_level, overflow " +
                        "FROM bin " +
                        "WHERE fill_level >= ? OR overflow = true " +
                        "ORDER BY fill_level DESC",
                (rs, rowNum) -> new BinPoint(
                        rs.getLong("id"),
                        rs.getDouble("latitude"),
                        rs.getDouble("longitude"),
                        rs.getInt("fill_level")
                ),
                threshold
        );

        // 2) available drivers
        List<DriverRow> drivers = jdbc.query(
                "SELECT id FROM driver WHERE available = true ORDER BY id",
                (rs, rowNum) -> new DriverRow(rs.getLong("id"))
        );

        if (bins.isEmpty()) {
            return Map.of(
                    "message", "No bins above threshold / overflow. Nothing to route.",
                    "routesCreated", 0,
                    "binsUsed", 0
            );
        }

        if (drivers.isEmpty()) {
            return Map.of(
                    "message", "No available drivers. Cannot generate routes.",
                    "routesCreated", 0,
                    "binsUsed", 0
            );
        }

        // ✅ EXTRA SAFETY: If only 1 bin exists, no meaningful route possible
        if (bins.size() < 2) {
            return Map.of(
                    "message", "Only 1 bin needs collection. Not generating routes (needs 2+ bins for a route line).",
                    "routesCreated", 0,
                    "binsUsed", bins.size()
            );
        }

        // 3) split bins among drivers (round-robin) with capacity limit
        Map<Long, List<BinPoint>> assignment = new LinkedHashMap<>();
        for (DriverRow d : drivers) assignment.put(d.id, new ArrayList<>());

        int driverIndex = 0;

        for (BinPoint b : bins) {
            int attempts = 0;

            while (attempts < drivers.size()) {
                long driverId = drivers.get(driverIndex).id;
                List<BinPoint> list = assignment.get(driverId);

                if (list.size() < maxStopsPerRoute) {
                    list.add(b);
                    driverIndex = (driverIndex + 1) % drivers.size();
                    break;
                }

                driverIndex = (driverIndex + 1) % drivers.size();
                attempts++;
            }
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

        // ✅ NEW STEP: Fix "single-bin routes"
        // If a driver got only 1 bin, move that bin into another route (if possible)
        assignment = mergeSingleBinRoutes(assignment, maxStopsPerRoute);

        int routesCreated = 0;
        int binsUsed = 0;

        for (Map.Entry<Long, List<BinPoint>> entry : assignment.entrySet()) {
            long driverId = entry.getKey();
            List<BinPoint> driverBins = entry.getValue();

            // ✅ Guarantee route is meaningful
            if (driverBins.size() < 2) {
                continue;
            }

            List<BinPoint> ordered = nearestNeighborOrder(driverBins);

            Long routeId = insertRouteAndReturnId(driverId, routeDate);

            for (BinPoint bp : ordered) {
                jdbc.update(
                        "INSERT INTO collection_route_bins (route_id, bin_id) VALUES (?, ?)",
                        routeId, bp.id
                );
            }

            routesCreated++;
            binsUsed += ordered.size();
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

    // ✅ NEW: merge single-bin routes into other routes so polylines always show
    private Map<Long, List<BinPoint>> mergeSingleBinRoutes(Map<Long, List<BinPoint>> assignment, int maxStopsPerRoute) {

        // Collect drivers who have exactly 1 bin
        List<Long> singleDrivers = assignment.entrySet().stream()
                .filter(e -> e.getValue().size() == 1)
                .map(Map.Entry::getKey)
                .toList();

        for (Long singleDriverId : singleDrivers) {

            BinPoint lonelyBin = assignment.get(singleDriverId).get(0);

            // Find a target driver who has space AND already has at least 2 bins (best)
            Long targetDriver = assignment.entrySet().stream()
                    .filter(e -> !e.getKey().equals(singleDriverId))
                    .filter(e -> e.getValue().size() < maxStopsPerRoute)
                    .sorted(Comparator.comparingInt(e -> e.getValue().size())) // add to smallest route first
                    .map(Map.Entry::getKey)
                    .findFirst()
                    .orElse(null);

            if (targetDriver != null) {
                assignment.get(targetDriver).add(lonelyBin);
                assignment.get(singleDriverId).clear();
            }
        }

        // remove empty ones again
        assignment = assignment.entrySet().stream()
                .filter(e -> !e.getValue().isEmpty())
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));

        return assignment;
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

    private Long insertRouteAndReturnId(long driverId, LocalDate routeDate) {
        return jdbc.queryForObject(
                "INSERT INTO collection_route (created_at, status, driver_id, route_date) " +
                        "VALUES (NOW(), ?, ?, ?) RETURNING id",
                Long.class,
                "pending",
                driverId,
                Date.valueOf(routeDate)
        );
    }

    private List<BinPoint> nearestNeighborOrder(List<BinPoint> bins) {
        if (bins.size() <= 2) return bins;

        List<BinPoint> remaining = new ArrayList<>(bins);
        List<BinPoint> ordered = new ArrayList<>();

        BinPoint current = remaining.remove(0);
        ordered.add(current);

        while (!remaining.isEmpty()) {
            BinPoint next = null;
            double best = Double.MAX_VALUE;

            for (BinPoint candidate : remaining) {
                double dist = haversine(current.lat, current.lng, candidate.lat, candidate.lng);
                if (dist < best) {
                    best = dist;
                    next = candidate;
                }
            }

            ordered.add(next);
            remaining.remove(next);
            current = next;
        }

        return ordered;
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
