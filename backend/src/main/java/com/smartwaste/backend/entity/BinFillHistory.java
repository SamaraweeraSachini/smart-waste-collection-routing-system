package com.smartwaste.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "bin_fill_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BinFillHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="bin_id", nullable = false)
    private Long binId;

    @Column(name="fill_level", nullable = false)
    private Integer fillLevel;

    @Column(nullable = false)
    private Boolean overflow;

    @Column(name="recorded_at", nullable = false)
    private LocalDateTime recordedAt;
}
