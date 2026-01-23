package com.java5.asm.repository;

import com.java5.asm.entity.CallHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CallHistoryRepository extends JpaRepository<CallHistory, Long> {
}