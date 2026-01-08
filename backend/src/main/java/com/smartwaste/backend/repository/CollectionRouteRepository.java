package com.smartwaste.backend.repository;

import com.smartwaste.backend.entity.CollectionRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CollectionRouteRepository extends JpaRepository<CollectionRoute, Long> {

}
