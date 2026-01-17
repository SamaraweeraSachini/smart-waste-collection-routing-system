package com.smartwaste.backend.service;

import com.smartwaste.backend.dto.RouteDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RouteQueryService {

    private final JdbcTemplate jdbc;

    public RouteQueryService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<RouteDto> getAllRoutesWithDistance() {

        List<Map<String, Object>> routes = jdbc.queryForList(
                "SELECT id, driver_id, route_date, status " +
                        "FROM collection_route " +
                        "ORDER BY id DESC"
        );

        List<RouteDto> result = new ArrayList<>();

        for (Map<String, Object> r : routes) {
            Long routeId = ((Number) r.get("id")).longValue();
            Long driverId = r.get("driver_id") == null ? null : ((Number) r.get("driver_id")).longValue();
            String routeDate = r.get("route_date") == null ? null : r.get("route_date").toString();
            String status = r.get("status") == null ? "" : r.get("status").toString();

            List<Long> binIds = jdbc.query(
                    "SELECT bin_id FROM collection_route_bins WHERE route_id = ? ORDER BY bin_id",
                    (rs, rowNum) -> rs.getLong("bin_id"),
                    routeId
            );

            double distanceKm = calculateDistanceKm(binIds);

            result.add(new RouteDto(routeId, driverId, binIds, routeDate, status, distanceKm));
        }

        return result;
    }

    private double calculateDistanceKm(List<Long> binIds) {
        if (binIds == null || binIds.size() < 2) return 0.0;

        String inSql = binIds.stream().map(x -> "?").collect(Collectors.joining(","));
        Object[] params = binIds.toArray();

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, latitude, longitude FROM bin WHERE id IN (" + inSql + ")",
                params
        );

        Map<Long, double[]> coords = new HashMap<>();
        for (Map<String, Object> row : rows) {
            Long id = ((Number) row.get("id")).longValue();
            double lat = ((Number) row.get("latitude")).doubleValue();
            double lng = ((Number) row.get("longitude")).doubleValue();
            coords.put(id, new double[]{lat, lng});
        }

        double totalMeters = 0.0;
        for (int i = 0; i < binIds.size() - 1; i++) {
            double[] a = coords.get(binIds.get(i));
            double[] b = coords.get(binIds.get(i + 1));
            if (a == null || b == null) continue;
            totalMeters += haversineMeters(a[0], a[1], b[0], b[1]);
        }

        return totalMeters / 1000.0;
    }

    private double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double aa = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
        return R * c;
    }
}
