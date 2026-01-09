package com.smartwaste.backend.controller;

import com.smartwaste.backend.dto.DriverDTO;
import com.smartwaste.backend.service.DriverService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;

    // GET all drivers
    @GetMapping
    public ResponseEntity<List<DriverDTO>> getAllDrivers() {
        return ResponseEntity.ok(driverService.getAllDrivers());
    }

    // POST create new driver
    @PostMapping
    public ResponseEntity<DriverDTO> createDriver(@RequestBody DriverDTO dto) {
        return ResponseEntity.ok(driverService.createDriver(dto));
    }

    // PUT update driver
    @PutMapping("/{id}")
    public ResponseEntity<DriverDTO> updateDriver(@PathVariable Long id, @RequestBody DriverDTO dto) {
        return ResponseEntity.ok(driverService.updateDriver(id, dto));
    }

    // DELETE driver
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDriver(@PathVariable Long id) {
        driverService.deleteDriver(id);
        return ResponseEntity.noContent().build();
    }
}
