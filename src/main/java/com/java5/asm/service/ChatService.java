package com.java5.asm.service;

import com.java5.asm.dto.ChatMessageDTO;
import com.java5.asm.dto.req.SendMessageReq;
import com.java5.asm.dto.resp.ConversationResp;
import com.java5.asm.dto.resp.MessageOnConversationResp;
import com.java5.asm.dto.resp.page.PagedConversationResp;
import com.java5.asm.dto.resp.page.PagedMessageResp;
import com.java5.asm.dto.ws.BinaryMessagePayload;

import java.util.List;
import java.util.UUID;


public interface ChatService {
    List<ConversationResp> getUserConversations();

    List<MessageOnConversationResp> getMessages(Long conversationId);

    MessageOnConversationResp sendMessage(SendMessageReq req);

    ConversationResp startPrivateChat(UUID senderId, UUID receiverId);

    void acceptMessageRequest(Long conversationId);

    void deleteConversation(Long conversationId);


    boolean isMemberOfConversation(UUID userId, Long conversationId);

    ChatMessageDTO saveBinaryMessage(BinaryMessagePayload payload);

    void markAsDelivered(Long messageId, UUID userId);

    void markAsSeen(Long messageId, UUID userId);

    void publishTypingEvent(Long conversationId, UUID userId, boolean isTyping);

    PagedConversationResp getUserConversationsPaged(int page, int size);

    PagedMessageResp getMessagesPaged(Long conversationId, UUID userId, int page, int size);
}
