package com.java5.asm.repository;

import com.java5.asm.entity.Participant;
import com.java5.asm.entity.ParticipantId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParticipantRepository extends JpaRepository<Participant, ParticipantId> {
}