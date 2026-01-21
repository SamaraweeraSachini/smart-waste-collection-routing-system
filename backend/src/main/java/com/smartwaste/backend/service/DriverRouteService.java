package com.smartwaste.backend.service;

import com.smartwaste.backend.dto.RouteDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

@Service
public class DriverRouteService {

    private final JdbcTemplate jdbc;
    private final RouteQueryService routeQueryService;

    public DriverRouteService(JdbcTemplate jdbc, RouteQueryService routeQueryService) {
        this.jdbc = jdbc;
        this.routeQueryService = routeQueryService;
    }

    // ✅ Find today's route for driver (returns RouteDto format your frontend already understands)
    public RouteDto getTodayRouteForDriver(Long driverId) {
        LocalDate today = LocalDate.now();

        // find route id for today + driver
        List<Long> ids = jdbc.query(
                "SELECT id FROM collection_route WHERE driver_id = ? AND route_date = ? ORDER BY id DESC LIMIT 1",
                (rs, rowNum) -> rs.getLong("id"),
                driverId,
                Date.valueOf(today)
        );

        if (ids.isEmpty()) return null;

        Long routeId = ids.get(0);

        // reuse your existing RouteQueryService DTO logic
        List<RouteDto> all = routeQueryService.getAllRoutesWithDistance();
        for (RouteDto r : all) {
            if (r.getId() != null && r.getId().longValue() == routeId.longValue()) {
                return r;
            }
        }
        return null;
    }

    @Transactional
    public void startRoute(Long routeId) {
        // only start if not completed
        jdbc.update(
                "UPDATE collection_route SET status = 'in_progress' WHERE id = ? AND status <> 'completed'",
                routeId
        );
    }

    @Transactional
    public void collectBin(Long routeId, Long binId) {
        // 1) collect bin (DB truth)
        jdbc.update(
                "UPDATE bin SET fill_level = 0, overflow = false WHERE id = ?",
                binId
        );

        // 2) when driver starts collecting, route should be in_progress (unless already completed)
        jdbc.update(
                "UPDATE collection_route SET status = 'in_progress' WHERE id = ? AND status <> 'completed'",
                routeId
        );

        // 3) if ALL bins in that route are now collected => route completed
        Integer remaining = jdbc.queryForObject(
                "SELECT COUNT(*) " +
                        "FROM collection_route_bins crb " +
                        "JOIN bin b ON b.id = crb.bin_id " +
                        "WHERE crb.route_id = ? AND (b.fill_level > 0 OR b.overflow = true)",
                Integer.class,
                routeId
        );

        if (remaining != null && remaining == 0) {
            jdbc.update(
                    "UPDATE collection_route SET status = 'completed' WHERE id = ?",
                    routeId
            );
        }
    }
}
