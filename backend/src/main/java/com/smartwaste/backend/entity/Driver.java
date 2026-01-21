package com.smartwaste.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "driver")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "vehicle_number")
    private String vehicleNumber;

    @Builder.Default
    @Column(nullable = false)
    private Boolean available = true; // default true to avoid null errors

    // ✅ NEW: driver live location (needed for nearest-driver assignment)
    private Double latitude;

    private Double longitude;
}
