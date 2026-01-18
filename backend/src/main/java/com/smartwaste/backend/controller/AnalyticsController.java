package com.smartwaste.backend.controller;

import com.smartwaste.backend.dto.AnalyticsSummaryDto;
import com.smartwaste.backend.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    // ✅ GET http://localhost:8080/api/analytics/summary
    // Optional: ?date=2026-01-17
    @GetMapping("/summary")
    public ResponseEntity<AnalyticsSummaryDto> summary(@RequestParam(required = false) String date) {
        LocalDate d = (date == null || date.isBlank()) ? LocalDate.now() : LocalDate.parse(date);
        return ResponseEntity.ok(analyticsService.getSummary(d));
    }
}
