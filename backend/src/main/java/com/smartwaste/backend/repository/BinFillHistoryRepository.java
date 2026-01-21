package com.smartwaste.backend.repository;

import com.smartwaste.backend.entity.BinFillHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BinFillHistoryRepository extends JpaRepository<BinFillHistory, Long> {
}
