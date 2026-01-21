package com.smartwaste.backend.iot;

import com.smartwaste.backend.entity.Bin;
import com.smartwaste.backend.repository.BinRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Random;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class BinIoTSimulator {

    private final BinRepository binRepository;
    private final Random random = new Random();

    // ✅ MAIN SWITCH (true = running, false = paused)
    private final AtomicBoolean enabled = new AtomicBoolean(true);

    public BinIoTSimulator(BinRepository binRepository) {
        this.binRepository = binRepository;
    }

    // ✅ Pause IoT simulation
    public void pause() {
        enabled.set(false);
        System.out.println("⏸️ IoT Simulator PAUSED");
    }

    // ✅ Resume IoT simulation
    public void resume() {
        enabled.set(true);
        System.out.println("▶️ IoT Simulator RESUMED");
    }

    public boolean isEnabled() {
        return enabled.get();
    }

    // ✅ Runs every 5 seconds
    @Scheduled(fixedRate = 5000)
    public void simulateBinFillChanges() {

        // ✅ HARD STOP HERE
        if (!enabled.get()) {
            // Comment this out if you don't want console spam while paused
            System.out.println("⏸️ IoT Simulator is paused (no updates applied)");
            return;
        }

        List<Bin> bins = binRepository.findAll();
        if (bins.isEmpty()) return;

        // Update up to 4 random bins each cycle
        int updates = Math.min(4, bins.size());

        for (int i = 0; i < updates; i++) {
            Bin bin = bins.get(random.nextInt(bins.size()));

            int current = bin.getFillLevel();

            // ✅ 20% chance: simulate a truck emptying the bin
            if (random.nextInt(100) < 20) {
                int emptiedTo = random.nextInt(21); // 0 - 20
                bin.setFillLevel(emptiedTo);
                bin.setOverflow(false);
                binRepository.save(bin);
                continue;
            }

            // ✅ Otherwise: simulate filling up
            int increase = 3 + random.nextInt(15); // +3 to +17
            int newLevel = Math.min(100, current + increase);

            bin.setFillLevel(newLevel);
            bin.setOverflow(newLevel >= 95);

            binRepository.save(bin);
        }

        System.out.println("✅ IoT Simulator updated some bins (fill + occasional empty)...");
    }
}
