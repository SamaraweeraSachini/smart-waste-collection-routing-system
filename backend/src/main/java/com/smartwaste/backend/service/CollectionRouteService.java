package com.smartwaste.backend.service;

import com.smartwaste.backend.dto.CollectionRouteDTO;
import com.smartwaste.backend.entity.Bin;
import com.smartwaste.backend.entity.CollectionRoute;
import com.smartwaste.backend.entity.Driver;
import com.smartwaste.backend.repository.BinRepository;
import com.smartwaste.backend.repository.CollectionRouteRepository;
import com.smartwaste.backend.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CollectionRouteService {

    private final CollectionRouteRepository routeRepository;
    private final DriverRepository driverRepository;
    private final BinRepository binRepository;

    public List<CollectionRouteDTO> getAllRoutes() {
        return routeRepository.findAll()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public CollectionRouteDTO createRoute(CollectionRouteDTO dto) {
        Driver driver = driverRepository.findById(dto.getDriverId())
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        List<Bin> bins = dto.getBinIds()
                .stream()
                .map(id -> binRepository.findById(id)
                        .orElseThrow(() -> new RuntimeException("Bin not found: " + id)))
                .collect(Collectors.toList());

        CollectionRoute route = CollectionRoute.builder()
                .driver(driver)
                .bins(bins)
                .routeDate(dto.getRouteDate())
                .status(dto.getStatus())
                .build();

        CollectionRoute saved = routeRepository.save(route);
        return toDTO(saved);
    }

    public CollectionRouteDTO updateRoute(Long id, CollectionRouteDTO dto) {
        CollectionRoute route = routeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        Driver driver = driverRepository.findById(dto.getDriverId())
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        List<Bin> bins = dto.getBinIds()
                .stream()
                .map(binId -> binRepository.findById(binId)
                        .orElseThrow(() -> new RuntimeException("Bin not found: " + binId)))
                .collect(Collectors.toList());

        route.setDriver(driver);
        route.setBins(bins);
        route.setRouteDate(dto.getRouteDate());
        route.setStatus(dto.getStatus());

        CollectionRoute updated = routeRepository.save(route);
        return toDTO(updated);
    }

    // ✅ NEW: Update ONLY status
    public CollectionRouteDTO updateRouteStatus(Long id, String newStatus) {
        CollectionRoute route = routeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        route.setStatus(newStatus);

        CollectionRoute updated = routeRepository.save(route);
        return toDTO(updated);
    }

    public void deleteRoute(Long id) {
        routeRepository.deleteById(id);
    }

    private CollectionRouteDTO toDTO(CollectionRoute route) {
        return CollectionRouteDTO.builder()
                .id(route.getId())
                .driverId(route.getDriver().getId())
                .binIds(route.getBins().stream().map(Bin::getId).collect(Collectors.toList()))
                .routeDate(route.getRouteDate())
                .status(route.getStatus())
                .build();
    }
}
