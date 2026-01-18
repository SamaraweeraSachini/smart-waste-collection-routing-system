package com.smartwaste.backend.controller;

import com.smartwaste.backend.dto.RouteDto;
import com.smartwaste.backend.dto.RouteStatusUpdateRequest;
import com.smartwaste.backend.service.RouteQueryService;
import com.smartwaste.backend.service.RouteStatusService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routes")
public class CollectionRouteController {

    private final RouteQueryService routeQueryService;
    private final RouteStatusService routeStatusService;

    public CollectionRouteController(RouteQueryService routeQueryService, RouteStatusService routeStatusService) {
        this.routeQueryService = routeQueryService;
        this.routeStatusService = routeStatusService;
    }

    // ✅ GET http://localhost:8080/api/routes
    @GetMapping
    public List<RouteDto> getAllRoutes() {
        return routeQueryService.getAllRoutesWithDistance();
    }

    // ✅ PATCH http://localhost:8080/api/routes/{id}/status
    // Body: { "status": "in_progress" }
    // OR:   /api/routes/{id}/status?status=in_progress
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
            // route not found etc.
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }
}
