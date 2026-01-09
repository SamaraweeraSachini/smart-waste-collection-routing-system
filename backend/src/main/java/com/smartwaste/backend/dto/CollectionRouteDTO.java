package com.smartwaste.backend.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionRouteDTO {

    private Long id;
    private Long driverId;
    private List<Long> binIds;
    private LocalDate routeDate;
    private String status;
}
