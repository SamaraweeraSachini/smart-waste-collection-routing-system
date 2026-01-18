package com.smartwaste.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AnalyticsSummaryDto {
    private long totalBins;
    private long criticalBins;        // overflow OR >=95%
    private long warningBins;         // 80-94% (not overflow)
    private long routesToday;
    private long completedRoutesToday;
    private double totalDistanceTodayKm;
}
