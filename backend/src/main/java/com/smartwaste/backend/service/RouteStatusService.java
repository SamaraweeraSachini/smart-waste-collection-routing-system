package com.smartwaste.backend.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.util.*;

@Service
public class RouteStatusService {

    private final JdbcTemplate jdbc;

    public RouteStatusService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private String norm(String s) {
        return String.valueOf(s == null ? "" : s).trim().toLowerCase();
    }

    private void validateStatus(String status) {
        String s = norm(status);
        if (!Set.of("assigned", "in_progress", "completed", "pending").contains(s)) {
            throw new IllegalArgumentException("Invalid status: " + status + " (use assigned|in_progress|completed)");
        }
    }

    @Transactional
    public void updateStatus(Long routeId, String newStatus) {
        validateStatus(newStatus);
        String s = norm(newStatus);

        int updated = jdbc.update(
                "UPDATE collection_route SET status = ? WHERE id = ?",
                s, routeId
        );

        if (updated == 0) {
            throw new RuntimeException("Route not found: " + routeId);
        }
    }

    // ✅ Dispatcher: start collecting for date
    // assigned/pending -> in_progress
    @Transactional
    public int startCollectingForDate(LocalDate date) {
        return jdbc.update(
                "UPDATE collection_route " +
                        "SET status = 'in_progress' " +
                        "WHERE route_date = ? AND LOWER(status) IN ('assigned','pending')",
                Date.valueOf(date)
        );
    }

    // ✅ Collect bin for a route (and auto-complete if last bin collected)
    @Transactional
    public Map<String, Object> collectBin(Long routeId, Long binId) {

        // 1) Ensure route exists + status is in_progress
        List<Map<String, Object>> routeRows = jdbc.queryForList(
                "SELECT id, status, route_date FROM collection_route WHERE id = ?",
                routeId
        );
        if (routeRows.isEmpty()) {
            throw new RuntimeException("Route not found: " + routeId);
        }

        String status = norm(String.valueOf(routeRows.get(0).get("status")));
        if (!status.equals("in_progress")) {
            return Map.of(
                    "message", "Route is not in progress; cannot collect bin",
                    "routeId", routeId,
                    "status", status
            );
        }

        // 2) Ensure the bin belongs to this route
        Integer belongsCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM collection_route_bins WHERE route_id = ? AND bin_id = ?",
                Integer.class,
                routeId, binId
        );
        if (belongsCount == null || belongsCount == 0) {
            return Map.of(
                    "message", "Bin does not belong to this route",
                    "routeId", routeId,
                    "binId", binId
            );
        }

        // 3) Collect the bin (fill_level=0 overflow=false)
        jdbc.update(
                "UPDATE bin SET fill_level = 0, overflow = false WHERE id = ?",
                binId
        );

        // 4) If all bins are collected -> complete route
        Integer remaining = jdbc.queryForObject(
                "SELECT COUNT(*) " +
                        "FROM collection_route_bins crb " +
                        "JOIN bin b ON b.id = crb.bin_id " +
                        "WHERE crb.route_id = ? AND (b.fill_level > 0 OR b.overflow = true)",
                Integer.class,
                routeId
        );

        boolean completed = (remaining != null && remaining == 0);

        if (completed) {
            jdbc.update(
                    "UPDATE collection_route SET status = 'completed' WHERE id = ?",
                    routeId
            );
            return Map.of(
                    "message", "Bin collected and route completed",
                    "routeId", routeId,
                    "binId", binId,
                    "routeStatus", "completed"
            );
        }

        return Map.of(
                "message", "Bin collected",
                "routeId", routeId,
                "binId", binId,
                "routeStatus", "in_progress"
        );
    }
}
