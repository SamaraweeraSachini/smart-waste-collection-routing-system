package com.smartwaste.backend.iot;

import com.smartwaste.backend.entity.Bin;
import com.smartwaste.backend.repository.BinRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Random;

@Component
public class BinIoTSimulator {

    private final BinRepository binRepository;
    private final Random random = new Random();

    public BinIoTSimulator(BinRepository binRepository) {
        this.binRepository = binRepository;
    }

    // ✅ Runs every 5 seconds
    @Scheduled(fixedRate = 5000)
    public void simulateBinFillChanges() {
        List<Bin> bins = binRepository.findAll();
        if (bins.isEmpty()) return;

        // Update up to 4 random bins each cycle
        int updates = Math.min(4, bins.size());

        for (int i = 0; i < updates; i++) {
            Bin bin = bins.get(random.nextInt(bins.size()));

            int current = bin.getFillLevel(); // fillLevel is int in your entity (default 0 if not set)

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
