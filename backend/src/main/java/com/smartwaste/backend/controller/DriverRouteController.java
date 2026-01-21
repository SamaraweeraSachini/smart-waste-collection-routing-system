package com.smartwaste.backend.controller;

import com.smartwaste.backend.dto.RouteDto;
import com.smartwaste.backend.service.DriverRouteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/driver/routes")
public class DriverRouteController {

    private final DriverRouteService driverRouteService;

    public DriverRouteController(DriverRouteService driverRouteService) {
        this.driverRouteService = driverRouteService;
    }

    // ✅ GET http://localhost:8080/api/driver/routes/today?driverId=5
    @GetMapping("/today")
    public ResponseEntity<?> getTodayRoute(@RequestParam Long driverId) {
        RouteDto dto = driverRouteService.getTodayRouteForDriver(driverId);
        if (dto == null) {
            return ResponseEntity.ok(Map.of(
                    "message", "No route assigned for today",
                    "route", null
            ));
        }
        return ResponseEntity.ok(dto);
    }

    // ✅ PATCH http://localhost:8080/api/driver/routes/{routeId}/start
    // sets route -> in_progress (Option 1 style is still query param in your system,
    // but for driver we keep it clean and internal)
    @PatchMapping("/{routeId}/start")
    public ResponseEntity<?> startRoute(@PathVariable Long routeId) {
        driverRouteService.startRoute(routeId);
        return ResponseEntity.ok(Map.of("message", "Route started"));
    }

    // ✅ PATCH http://localhost:8080/api/driver/routes/{routeId}/collect/{binId}
    // marks bin as collected + auto-updates route status (in_progress/completed)
    @PatchMapping("/{routeId}/collect/{binId}")
    public ResponseEntity<?> collectBin(@PathVariable Long routeId, @PathVariable Long binId) {
        driverRouteService.collectBin(routeId, binId);
        return ResponseEntity.ok(Map.of("message", "Bin collected"));
    }
}
