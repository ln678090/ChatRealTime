package com.java5.asm.service;

import com.java5.asm.entity.User;

import java.io.IOException;
import java.util.UUID;

public interface FriendshipService {
    boolean isBlocked(UUID receiverId, UUID senderId);

    void unfriend(UUID targetUserId);

    boolean isFriend(UUID senderId, UUID receiverId);

    UUID requireMeId();

    User requireUser(UUID id);

    void request(UUID targetUserId) throws IOException;

    void cancel(UUID targetUserId);

    void accept(UUID requesterId);

    String getUiStatus(UUID me, UUID other);
}
