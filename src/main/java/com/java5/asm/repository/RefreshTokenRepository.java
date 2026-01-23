package com.java5.asm.repository;

import com.java5.asm.entity.RefreshToken;
import com.java5.asm.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    int deleteByUser(User user);

    @Query("select r from RefreshToken r where r.user = ?1 and r.revoked = false")
    List<RefreshToken> findAllByUserAndRevokedFalse(User user);
}