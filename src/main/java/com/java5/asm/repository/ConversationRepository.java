package com.java5.asm.repository;

import com.java5.asm.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    // Tìm hội thoại 1-1 giữa 2 người (bất kể ai là người tạo)
    @Query("SELECT c FROM Conversation c " +
            "JOIN Participant p1 ON c.id = p1.conversation.id " +
            "JOIN Participant p2 ON c.id = p2.conversation.id " +
            "WHERE c.isGroup = false " +
            "AND p1.user.id = :userId1 AND p2.user.id = :userId2")
    Optional<Conversation> findExistingPrivateConversation(@Param("userId1") UUID userId1,
                                                           @Param("userId2") UUID userId2);
}