package com.smartwaste.backend.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RouteStatusService {

    private final JdbcTemplate jdbc;

    public RouteStatusService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Accepts: pending, assigned, in_progress, completed (any case)
    private String normalizeStatus(String status) {
        if (status == null) return null;

        String s = status.trim().toLowerCase();

        // allow a few common variants
        if (s.equals("in progress")) s = "in_progress";
        if (s.equals("in-progress")) s = "in_progress";

        return s;
    }

    private boolean isValid(String s) {
        return s != null && (
                s.equals("pending") ||
                s.equals("assigned") ||
                s.equals("in_progress") ||
                s.equals("completed")
        );
    }

    @Transactional
    public void updateStatus(Long routeId, String newStatusRaw) {
        String newStatus = normalizeStatus(newStatusRaw);

        if (!isValid(newStatus)) {
            throw new IllegalArgumentException(
                    "Invalid status: " + newStatusRaw +
                    " | Allowed: pending, assigned, in_progress, completed"
            );
        }

        // check route exists
        Integer exists = jdbc.queryForObject(
                "SELECT COUNT(*) FROM collection_route WHERE id = ?",
                Integer.class,
                routeId
        );

        if (exists == null || exists == 0) {
            throw new RuntimeException("Route not found: " + routeId);
        }

        // update
        jdbc.update(
                "UPDATE collection_route SET status = ? WHERE id = ?",
                newStatus,
                routeId
        );
    }
}
