package com.java5.asm.repository;

import com.java5.asm.entity.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    @Query("""
                select f from Friendship f
                where (f.requester.id = :u1 and f.addressee.id = :u2)
                   or (f.requester.id = :u2 and f.addressee.id = :u1)
            """)
    Optional<Friendship> findBetweenUsers(UUID u1, UUID u2);

    @Query("SELECT f FROM Friendship f " +
            "WHERE (f.requester.id = :userId1 AND f.addressee.id = :userId2) " +
            "OR (f.requester.id = :userId2 AND f.addressee.id = :userId1)")
    Optional<Friendship> findFriendship(@Param("userId1") UUID userId1, @Param("userId2") UUID userId2);
}