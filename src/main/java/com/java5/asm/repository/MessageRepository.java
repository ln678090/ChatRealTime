package com.java5.asm.repository;

import com.java5.asm.entity.Message;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, Long> {
    @EntityGraph(attributePaths = {"sender"})
    Optional<Message> findFirstByConversationIdOrderByCreatedAtDesc(Long conversationId);

    Optional<Message> findTopByConversationIdOrderByCreatedAtDesc(Long id);

    @EntityGraph(attributePaths = {"sender"})
    List<Message> findAllByConversationIdOrderByCreatedAtAsc(Long conversationId);

    @Query("""
                SELECT m FROM Message m
                JOIN Participant p
                    ON p.conversation.id = m.conversation.id
                WHERE m.conversation.id = :conversationId
                  AND p.user.id = :userId
                  AND m.createdAt >= p.joinedAt
                ORDER BY m.createdAt ASC
            """)
    List<Message> findMessagesVisibleForUser(Long conversationId, UUID userId);

    @Query("""
                SELECT p.joinedAt FROM Participant p
                WHERE p.conversation.id = :conversationId
                  AND p.user.id = :userId
            """)
    Optional<OffsetDateTime> findJoinedAt(Long conversationId, UUID userId);

    @Query("select m from Message m join fetch m.sender s where m.conversation.id = ?1 and m.createdAt > ?2 order by m.createdAt")
    List<Message> findByConversation_IdAndCreatedAtAfterOrderByCreatedAtAsc(
            Long conversationId,
            OffsetDateTime joinedAt
    );

    List<Message> findByConversationIdOrderByCreatedAtAsc(Long conversationId);

    @EntityGraph(attributePaths = {"sender"})
    Optional<Message> findFirstByConversation_IdOrderByCreatedAtDesc(Long conversationId);

}