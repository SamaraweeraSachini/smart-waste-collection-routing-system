package com.smartwaste.backend.repository;

import com.smartwaste.backend.entity.CollectionRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface CollectionRouteRepository extends JpaRepository<CollectionRoute, Long> {

    List<CollectionRoute> findByRouteDate(LocalDate routeDate);

    @Query("""
        SELECT r FROM CollectionRoute r
        WHERE r.routeDate = :date AND LOWER(r.status) IN ('assigned','in_progress')
    """)
    List<CollectionRoute> findActiveRoutesByDate(@Param("date") LocalDate date);

    @Query("""
        SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
        FROM CollectionRoute r
        JOIN r.bins b
        WHERE b.id = :binId AND LOWER(r.status) IN ('assigned','in_progress')
    """)
    boolean existsActiveRouteContainingBin(@Param("binId") Long binId);
}
