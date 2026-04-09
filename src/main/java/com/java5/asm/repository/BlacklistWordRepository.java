package com.java5.asm.repository;

import com.java5.asm.entity.BlacklistWord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BlacklistWordRepository extends JpaRepository<BlacklistWord, UUID> {
    boolean existsByKeywordIgnoreCaseAndIsDeletedFalse(String keyword);

    @EntityGraph(attributePaths = {"createdBy"})
    Page<BlacklistWord> findAll(Specification<BlacklistWord> spec, Pageable pageable);

    List<BlacklistWord> findByIsActiveTrueAndIsDeletedFalse();
}