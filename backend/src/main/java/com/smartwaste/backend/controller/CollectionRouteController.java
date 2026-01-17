package com.smartwaste.backend.controller;

import com.smartwaste.backend.dto.RouteDto;
import com.smartwaste.backend.service.RouteQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/routes")
public class CollectionRouteController {

    private final RouteQueryService routeQueryService;

    public CollectionRouteController(RouteQueryService routeQueryService) {
        this.routeQueryService = routeQueryService;
    }

    // ✅ GET http://localhost:8080/api/routes
    @GetMapping
    public List<RouteDto> getAllRoutes() {
        return routeQueryService.getAllRoutesWithDistance();
    }
}
