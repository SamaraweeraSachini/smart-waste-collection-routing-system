package com.smartwaste.backend.repository;

import com.smartwaste.backend.entity.Bin;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BinRepository extends JpaRepository<Bin, Long> {
}
