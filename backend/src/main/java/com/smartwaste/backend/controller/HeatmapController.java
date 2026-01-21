package com.smartwaste.backend.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/heatmap")
public class HeatmapController {

    private final JdbcTemplate jdbc;

    public HeatmapController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * ✅ REAL-TIME heatmap (CURRENT state only)
     * Only returns bins that are Yellow/Red:
     * - fill_level >= 80 OR overflow = true
     *
     * GET /api/heatmap/bins
     */
    @GetMapping("/bins")
    public List<Map<String, Object>> getHeatmapBins() {

        String sql =
                "SELECT id AS bin_id, latitude, longitude, fill_level, overflow " +
                "FROM bin " +
                "WHERE fill_level >= 80 OR overflow = true " +
                "ORDER BY fill_level DESC";

        return jdbc.queryForList(sql);
    }
}
