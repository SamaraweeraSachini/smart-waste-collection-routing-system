package com.smartwaste.backend.controller;

import com.smartwaste.backend.dto.BinDTO;
import com.smartwaste.backend.service.BinService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bins")
@RequiredArgsConstructor
public class BinController {

    private final BinService binService;

    // ✅ Get all bins
    @GetMapping
    public ResponseEntity<List<BinDTO>> getAllBins() {
        return ResponseEntity.ok(binService.getAllBins());
    }

    // ✅ Create a bin
    @PostMapping
    public ResponseEntity<BinDTO> createBin(@RequestBody BinDTO dto) {
        return ResponseEntity.ok(binService.createBin(dto));
    }

    // ✅ Update a bin
    @PutMapping("/{id}")
    public ResponseEntity<BinDTO> updateBin(@PathVariable Long id, @RequestBody BinDTO dto) {
        return ResponseEntity.ok(binService.updateBin(id, dto));
    }

    // ✅ NEW: Collect bin (truck reached bin)
    // PATCH http://localhost:8080/api/bins/{id}/collect
    @PatchMapping("/{id}/collect")
    public ResponseEntity<?> collectBin(@PathVariable Long id) {
        binService.collectBin(id);
        return ResponseEntity.ok().build();
    }

    // ✅ Delete a bin
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBin(@PathVariable Long id) {
        binService.deleteBin(id);
        return ResponseEntity.noContent().build();
    }
}
