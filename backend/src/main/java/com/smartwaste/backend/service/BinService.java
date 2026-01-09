package com.smartwaste.backend.service;

import com.smartwaste.backend.dto.BinDTO;
import com.smartwaste.backend.entity.Bin;
import com.smartwaste.backend.repository.BinRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BinService {

    private final BinRepository binRepository;

    // Get all bins
    public List<BinDTO> getAllBins() {
        return binRepository.findAll()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // Create new bin
    public BinDTO createBin(BinDTO dto) {
        Bin bin = Bin.builder()
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .fillLevel(dto.getFillLevel())
                .overflow(dto.isOverflow())
                .build();
        Bin saved = binRepository.save(bin);
        return toDTO(saved);
    }

    // Update bin
    public BinDTO updateBin(Long id, BinDTO dto) {
        Bin bin = binRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bin not found"));
        bin.setLatitude(dto.getLatitude());
        bin.setLongitude(dto.getLongitude());
        bin.setFillLevel(dto.getFillLevel());
        bin.setOverflow(dto.isOverflow());
        Bin updated = binRepository.save(bin);
        return toDTO(updated);
    }

    // Delete bin
    public void deleteBin(Long id) {
        binRepository.deleteById(id);
    }

    // Helper to convert entity to DTO
    private BinDTO toDTO(Bin bin) {
        return BinDTO.builder()
                .id(bin.getId())
                .latitude(bin.getLatitude())
                .longitude(bin.getLongitude())
                .fillLevel(bin.getFillLevel())
                .overflow(bin.isOverflow())
                .build();
    }
}
