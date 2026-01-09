package com.smartwaste.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BinDTO {
    private Long id;
    private double latitude;
    private double longitude;
    private int fillLevel;
    private boolean overflow;
}
