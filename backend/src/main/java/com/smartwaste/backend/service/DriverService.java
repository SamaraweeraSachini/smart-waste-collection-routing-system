package com.smartwaste.backend.service;

import com.smartwaste.backend.dto.DriverDTO;
import com.smartwaste.backend.entity.Driver;
import com.smartwaste.backend.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DriverService {

    private final DriverRepository driverRepository;

    // Get all drivers
    public List<DriverDTO> getAllDrivers() {
        return driverRepository.findAll()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // Create a new driver
    public DriverDTO createDriver(DriverDTO dto) {
        Driver driver = Driver.builder()
                .name(dto.getName())
                .phoneNumber(dto.getPhoneNumber())
                .vehicleNumber(dto.getVehicleNumber())
                .build(); // available defaults to true
        Driver saved = driverRepository.save(driver);
        return toDTO(saved);
    }

    // Update driver
    public DriverDTO updateDriver(Long id, DriverDTO dto) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        driver.setName(dto.getName());
        driver.setPhoneNumber(dto.getPhoneNumber());
        driver.setVehicleNumber(dto.getVehicleNumber());
        driver.setAvailable(dto.getAvailable()); // update availability if needed
        Driver updated = driverRepository.save(driver);
        return toDTO(updated);
    }

    // Delete driver
    public void deleteDriver(Long id) {
        driverRepository.deleteById(id);
    }

    // Convert entity to DTO
    private DriverDTO toDTO(Driver driver) {
        return DriverDTO.builder()
                .id(driver.getId())
                .name(driver.getName())
                .phoneNumber(driver.getPhoneNumber())
                .vehicleNumber(driver.getVehicleNumber())
                .available(driver.getAvailable())
                .build();
    }
}
