package com.smartwaste.backend.service;

import com.smartwaste.backend.dto.AnalyticsSummaryDto;
import com.smartwaste.backend.dto.RouteDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

@Service
public class AnalyticsService {

    private final JdbcTemplate jdbc;
    private final RouteQueryService routeQueryService;

    public AnalyticsService(JdbcTemplate jdbc, RouteQueryService routeQueryService) {
        this.jdbc = jdbc;
        this.routeQueryService = routeQueryService;
    }

    public AnalyticsSummaryDto getSummary(LocalDate date) {

        // ✅ bins
        Long totalBins = jdbc.queryForObject("SELECT COUNT(*) FROM bin", Long.class);

        Long criticalBins = jdbc.queryForObject(
                "SELECT COUNT(*) FROM bin WHERE overflow = true OR fill_level >= 95",
                Long.class
        );

        Long warningBins = jdbc.queryForObject(
                "SELECT COUNT(*) FROM bin WHERE overflow = false AND fill_level >= 80 AND fill_level < 95",
                Long.class
        );

        // ✅ routes
        Long routesToday = jdbc.queryForObject(
                "SELECT COUNT(*) FROM collection_route WHERE route_date = ?",
                Long.class,
                Date.valueOf(date)
        );

        Long completedRoutesToday = jdbc.queryForObject(
                "SELECT COUNT(*) FROM collection_route WHERE route_date = ? AND status = 'completed'",
                Long.class,
                Date.valueOf(date)
        );

        // ✅ total distance today
        String dateStr = date.toString();

        List<RouteDto> allRoutes = routeQueryService.getAllRoutesWithDistance();

        double totalDistanceTodayKm = allRoutes.stream()
                .filter(r -> r.getRouteDate() != null && dateStr.equals(r.getRouteDate().toString()))
                .mapToDouble(RouteDto::getDistanceKm)   // ✅ FIX: distanceKm is primitive double, no null checks
                .sum();

        return new AnalyticsSummaryDto(
                totalBins == null ? 0 : totalBins,
                criticalBins == null ? 0 : criticalBins,
                warningBins == null ? 0 : warningBins,
                routesToday == null ? 0 : routesToday,
                completedRoutesToday == null ? 0 : completedRoutesToday,
                totalDistanceTodayKm
        );
    }
}
