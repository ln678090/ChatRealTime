package com.java5.asm.service.impl;

import com.java5.asm.entity.Friendship;
import com.java5.asm.repository.FriendshipRepository;
import com.java5.asm.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FriendshipServiceImpl implements FriendshipService {
    private final FriendshipRepository friendshipRepository;

    @Override
    public boolean isBlocked(UUID receiverId, UUID senderId) {
        return friendshipRepository.findBetweenUsers(receiverId, senderId)
                .map(f -> "ACCEPTED".equals(f.getStatus()))
                .orElse(false);
    }


    @Override
    public void unfriend(UUID targetUserId) {
        String userIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
        UUID currentUserId = UUID.fromString(userIdStr);

        Friendship friendship = friendshipRepository.findFriendship(currentUserId, targetUserId)
                .orElseThrow(() -> new RuntimeException("Hai người chưa kết bạn hoặc không tìm thấy mối quan hệ"));
        friendshipRepository.delete(friendship);
    }

    @Override
    public boolean isFriend(UUID senderId, UUID receiverId) {
        return friendshipRepository.findBetweenUsers(senderId, receiverId)
                .map(f -> "BLOCKED".equals(f.getStatus()) && f.getBlockedBy().getId().equals(senderId))
                .orElse(false);
    }
}
