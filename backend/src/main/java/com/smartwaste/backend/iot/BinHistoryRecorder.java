package com.smartwaste.backend.iot;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class BinHistoryRecorder {

    private final JdbcTemplate jdbc;

    public BinHistoryRecorder(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ✅ Option B: every 30 seconds
    @Scheduled(fixedRate = 30000)
    public void recordSnapshot() {

        List<Map<String, Object>> bins = jdbc.queryForList(
                "SELECT id, fill_level, overflow FROM bin"
        );

        if (bins.isEmpty()) return;

        List<Object[]> batch = new ArrayList<>();

        for (Map<String, Object> row : bins) {
            Long binId = ((Number) row.get("id")).longValue();
            int fillLevel = row.get("fill_level") == null ? 0 : ((Number) row.get("fill_level")).intValue();
            boolean overflow = row.get("overflow") != null && (Boolean) row.get("overflow");

            batch.add(new Object[]{binId, fillLevel, overflow});
        }

        jdbc.batchUpdate(
                "INSERT INTO bin_fill_history (bin_id, fill_level, overflow, recorded_at) VALUES (?, ?, ?, NOW())",
                batch
        );

        System.out.println("🟣 BinHistoryRecorder saved snapshot rows: " + batch.size());
    }
}
