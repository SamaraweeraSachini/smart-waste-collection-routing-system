package com.smartwaste.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bins")
public class BinIotController {

    private final JdbcTemplate jdbc;

    public BinIotController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ✅ PATCH /api/bins/{id}/fill?level=85
    @PatchMapping("/{id}/fill")
    public ResponseEntity<?> updateFillLevel(@PathVariable Long id, @RequestParam int level) {

        // 1) read current fill
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, fill_level, overflow FROM bin WHERE id = ?",
                id
        );

        if (rows.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        int currentFill = ((Number) rows.get(0).get("fill_level")).intValue();

        // 2) OPTION A lock: if bin belongs to active route (assigned or in_progress)
        Boolean locked = jdbc.queryForObject(
                "SELECT EXISTS (" +
                        "SELECT 1 " +
                        "FROM collection_route_bins crb " +
                        "JOIN collection_route cr ON cr.id = crb.route_id " +
                        "WHERE crb.bin_id = ? AND LOWER(cr.status) IN ('assigned','in_progress')" +
                        ")",
                Boolean.class,
                id
        );

        boolean isLocked = locked != null && locked;

        // Ignore IoT increases when locked
        if (isLocked && level > currentFill) {
            return ResponseEntity.ok(Map.of(
                    "message", "Ignored IoT increase because bin is locked in an active route",
                    "binId", id,
                    "currentFill", currentFill,
                    "incomingFill", level,
                    "locked", true
            ));
        }

        boolean overflow = level >= 95;

        // 3) update bin
        jdbc.update(
                "UPDATE bin SET fill_level = ?, overflow = ? WHERE id = ?",
                level, overflow, id
        );

        return ResponseEntity.ok(Map.of(
                "message", "Bin updated",
                "binId", id,
                "fillLevel", level,
                "overflow", overflow,
                "locked", isLocked
        ));
    }
}
