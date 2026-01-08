package com.smartwaste.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime createdAt; // When route was created

    private String status; // ASSIGNED, IN_PROGRESS, COMPLETED

    @ManyToMany
    @JoinTable(
        name = "route_bins",
        joinColumns = @JoinColumn(name = "route_id"),
        inverseJoinColumns = @JoinColumn(name = "bin_id")
    )
    private List<Bin> bins; // Bins assigned to this route

    @ManyToOne
    @JoinColumn(name = "driver_id")
    private Driver driver; // Driver assigned to this route
}
