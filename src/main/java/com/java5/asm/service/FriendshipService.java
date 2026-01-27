package com.java5.asm.service;

import java.util.UUID;

public interface FriendshipService {
    boolean isBlocked(UUID receiverId, UUID senderId);

    void unfriend(UUID targetUserId);

    boolean isFriend(UUID senderId, UUID receiverId);
}
