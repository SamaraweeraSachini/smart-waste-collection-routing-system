package com.smartwaste.backend.controller;

import com.smartwaste.backend.dto.RouteDto;
import com.smartwaste.backend.dto.RouteStatusUpdateRequest;
import com.smartwaste.backend.service.RouteQueryService;
import com.smartwaste.backend.service.RouteStatusService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/routes")
public class CollectionRouteController {

    private final RouteQueryService routeQueryService;
    private final RouteStatusService routeStatusService;

    public CollectionRouteController(RouteQueryService routeQueryService, RouteStatusService routeStatusService) {
        this.routeQueryService = routeQueryService;
        this.routeStatusService = routeStatusService;
    }

    // ✅ GET /api/routes
    // ✅ GET /api/routes?date=2026-01-20
    @GetMapping
    public List<RouteDto> getRoutes(@RequestParam(required = false) String date) {
        if (date == null || date.isBlank()) {
            return routeQueryService.getAllRoutesWithDistance();
        }
        LocalDate d = LocalDate.parse(date.trim());
        return routeQueryService.getRoutesByDateWithDistance(d);
    }

    // ✅ PATCH /api/routes/{id}/status?status=in_progress  (Option 1)
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateRouteStatus(
            @PathVariable Long id,
            @RequestBody(required = false) RouteStatusUpdateRequest body,
            @RequestParam(required = false) String status
    ) {
        try {
            String newStatus = null;

            if (body != null && body.getStatus() != null && !body.getStatus().isBlank()) {
                newStatus = body.getStatus();
            } else if (status != null && !status.isBlank()) {
                newStatus = status;
            }

            if (newStatus == null || newStatus.isBlank()) {
                return ResponseEntity.badRequest().body(
                        "Missing status. Send JSON body {\"status\":\"in_progress\"} OR use ?status=in_progress"
                );
            }

            routeStatusService.updateStatus(id, newStatus);
            return ResponseEntity.ok().build();

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    // ✅ NEW: POST /api/routes/start-collecting?date=2026-01-20
    // If date missing -> today
    @PostMapping("/start-collecting")
    public ResponseEntity<?> startCollecting(@RequestParam(required = false) String date) {
        LocalDate d = (date == null || date.isBlank()) ? LocalDate.now() : LocalDate.parse(date.trim());
        int updated = routeStatusService.startCollectingForDate(d);

        return ResponseEntity.ok(Map.of(
                "message", "Collecting started",
                "routeDate", d.toString(),
                "routesUpdated", updated
        ));
    }

    // ✅ NEW: POST /api/routes/{routeId}/collect-bin/{binId}
    @PostMapping("/{routeId}/collect-bin/{binId}")
    public ResponseEntity<?> collectBin(@PathVariable Long routeId, @PathVariable Long binId) {
        try {
            Map<String, Object> result = routeStatusService.collectBin(routeId, binId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }
}
