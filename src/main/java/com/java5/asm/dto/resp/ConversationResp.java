package com.java5.asm.dto.resp;

import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Builder
public record ConversationResp(
        Long conversationId,
        String chatName,  // Tên hiển thị (Tên người khác hoặc tên nhóm)
        String avatar,        // Avatar hiển thị
        Boolean isGroup,
        String lastMessage,   // Nội dung tin nhắn cuối
        OffsetDateTime lastMessageTime, // Thời gian tin nhắn cuối
        Boolean isOnline,     // Trạng thái online của người kia (nếu là chat 1-1)
        Integer unreadCount,  // Số tin nhắn chưa đọc (Optional)
        UUID otherUserId,
        String otherUserName,
        String friendshipStatus, // NONE | PENDING_IN | PENDING_OUT | FRIEND | BLOCKED
        Boolean canMessage
) {

}
