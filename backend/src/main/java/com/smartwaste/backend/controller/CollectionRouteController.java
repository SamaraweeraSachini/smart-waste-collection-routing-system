package com.smartwaste.backend.controller;

import com.smartwaste.backend.dto.CollectionRouteDTO;
import com.smartwaste.backend.service.CollectionRouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class CollectionRouteController {

    private final CollectionRouteService routeService;

    @GetMapping
    public ResponseEntity<List<CollectionRouteDTO>> getAllRoutes() {
        return ResponseEntity.ok(routeService.getAllRoutes());
    }

    @PostMapping
    public ResponseEntity<CollectionRouteDTO> createRoute(@RequestBody CollectionRouteDTO dto) {
        return ResponseEntity.ok(routeService.createRoute(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CollectionRouteDTO> updateRoute(@PathVariable Long id,
                                                          @RequestBody CollectionRouteDTO dto) {
        return ResponseEntity.ok(routeService.updateRoute(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoute(@PathVariable Long id) {
        routeService.deleteRoute(id);
        return ResponseEntity.noContent().build();
    }
}
