package com.smartwaste.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private double latitude;  // Latitude of bin on map
    private double longitude; // Longitude of bin on map

    private int fillLevel;    // 0 - 100 %

    private boolean overflow; // true if bin is overflowing
}
