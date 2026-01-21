package com.smartwaste.backend.controller;

import com.smartwaste.backend.iot.BinIoTSimulator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/iot")
public class IoTControlController {

    private final BinIoTSimulator binIoTSimulator;

    public IoTControlController(BinIoTSimulator binIoTSimulator) {
        this.binIoTSimulator = binIoTSimulator;
    }

    // ✅ GET /api/iot/status
    @GetMapping("/status")
    public ResponseEntity<?> status() {
        return ResponseEntity.ok(Map.of(
                "iotEnabled", binIoTSimulator.isEnabled(),
                "message", binIoTSimulator.isEnabled() ? "IoT Simulator is RUNNING" : "IoT Simulator is PAUSED"
        ));
    }

    // ✅ POST /api/iot/pause
    @PostMapping("/pause")
    public ResponseEntity<?> pause() {
        binIoTSimulator.pause();
        return ResponseEntity.ok(Map.of(
                "iotEnabled", false,
                "message", "IoT Simulator PAUSED ✅"
        ));
    }

    // ✅ POST /api/iot/resume
    @PostMapping("/resume")
    public ResponseEntity<?> resume() {
        binIoTSimulator.resume();
        return ResponseEntity.ok(Map.of(
                "iotEnabled", true,
                "message", "IoT Simulator RESUMED ✅"
        ));
    }
}
