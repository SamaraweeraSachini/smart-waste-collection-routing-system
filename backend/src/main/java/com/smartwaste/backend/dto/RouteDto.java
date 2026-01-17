package com.smartwaste.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RouteDto {
    private Long id;
    private Long driverId;
    private List<Long> binIds;
    private String routeDate;
    private String status;

    // ✅ NEW
    private double distanceKm;
}
