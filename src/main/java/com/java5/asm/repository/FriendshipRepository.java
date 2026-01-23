package com.java5.asm.repository;

import com.java5.asm.entity.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
}