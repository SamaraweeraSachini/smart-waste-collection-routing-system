package com.smartwaste.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "collection_route")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Link to driver
    @ManyToOne
    @JoinColumn(name = "driver_id", nullable = false)
    private Driver driver;

    // Link to bins
    @ManyToMany
    @JoinTable(
            name = "collection_route_bins",
            joinColumns = @JoinColumn(name = "route_id"),
            inverseJoinColumns = @JoinColumn(name = "bin_id")
    )
    private List<Bin> bins;

    private LocalDate routeDate;

    @Column(nullable = false)
    private String status; // e.g., "PENDING", "COMPLETED"
}
