package com.smartwaste.backend.controller;

import com.smartwaste.backend.service.AutoRouteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/routes")
public class AutoRouteController {

    private final AutoRouteService autoRouteService;

    public AutoRouteController(AutoRouteService autoRouteService) {
        this.autoRouteService = autoRouteService;
    }

    // POST http://localhost:8080/api/routes/auto-generate
    // Optional query params:
    // ?date=2026-01-12&threshold=80&maxStops=6
    @PostMapping("/auto-generate")
    public ResponseEntity<Map<String, Object>> autoGenerate(
            @RequestParam(required = false) String date,
            @RequestParam(defaultValue = "80") int threshold,
            @RequestParam(defaultValue = "6") int maxStops
    ) {
        LocalDate routeDate = (date == null || date.isBlank()) ? LocalDate.now() : LocalDate.parse(date);
        Map<String, Object> result = autoRouteService.generateRoutes(routeDate, threshold, maxStops);
        return ResponseEntity.ok(result);
    }
}
