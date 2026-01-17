package com.smartwaste.backend.controller;

import com.smartwaste.backend.dto.BinFillUpdateRequest;
import com.smartwaste.backend.entity.Bin;
import com.smartwaste.backend.repository.BinRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bins")
public class BinIotController {

    private final BinRepository binRepository;

    public BinIotController(BinRepository binRepository) {
        this.binRepository = binRepository;
    }

    // ✅ IoT-like update endpoint:
    // PATCH http://localhost:8080/api/bins/{id}/fill
    // Body: { "fillLevel": 88 }
    @PatchMapping("/{id}/fill")
    public ResponseEntity<?> updateBinFill(@PathVariable Long id, @RequestBody BinFillUpdateRequest req) {
        Bin bin = binRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bin not found: " + id));

        int safe = Math.max(0, Math.min(100, req.getFillLevel()));
        bin.setFillLevel(safe);

        // Simple overflow rule: >=95 means overflow
        bin.setOverflow(safe >= 95);

        Bin saved = binRepository.save(bin);
        return ResponseEntity.ok(saved);
    }
}
