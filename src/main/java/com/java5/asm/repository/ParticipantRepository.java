package com.java5.asm.repository;

import com.java5.asm.entity.Conversation;
import com.java5.asm.entity.Participant;
import com.java5.asm.entity.ParticipantId;
import com.java5.asm.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<Participant, ParticipantId> {


    @Query("select p.conversation from Participant p where p.user.id = ?1")
    List<Conversation> findConversationsByUserId(UUID userId);

    // Query tìm user kia (người không phải là mình) trong hội thoại
    @Query("select p.user from Participant p where p.conversation.id = ?1 and p.user.id <> ?2")
    Optional<User> findUserByConversationIdAndUserId(long conversationId, UUID userId);

    // Kiểm tra user có trong hội thoại không
    boolean existsByConversationIdAndUserId(Long conversationId, UUID userId);

    Optional<Participant> findByConversation_IdAndUser_Id(Long conversation_id, UUID user_id);

    @Query("""
              select p from Participant p
              where p.conversation.id = :cid
                and p.user.id <> :uid
            """)
    Optional<Participant> findOtherParticipant(Long cid, UUID uid);

    @Query("""
              select p from Participant p
              join fetch p.user u
              where p.conversation.id = :cid
                and u.id <> :me
            """)
    Optional<Participant> findOtherParticipantWithUser(Long cid, UUID me);

    void deleteByConversation_IdAndUser_Id(Long conversationId, UUID userId);

    @Query("""
                SELECT p.joinedAt FROM Participant p
                WHERE p.conversation.id = :conversationId
                  AND p.user.id = :userId
            """)
    Optional<OffsetDateTime> findJoinedAt(Long conversationId, UUID userId);

    List<Participant> findByConversation_Id(Long conversationId);

    @Query("""
            SELECT c
            FROM Participant p
            JOIN p.conversation c
            LEFT JOIN Message m ON m.conversation.id = c.id
            WHERE p.user.id = :userId
            GROUP BY c.id, c.chatName, c.createdAt, c.isGroup
            ORDER BY MAX(COALESCE(m.createdAt, c.createdAt)) DESC, c.id DESC
            """)
    Page<Conversation> findConversationsByUserIdPaged(@Param("userId") UUID userId, Pageable pageable);

    boolean existsByConversation_IdAndUser_Id(Long conversationId, UUID userId);


}