package com.java5.asm.service;

import com.java5.asm.dto.req.SendMessageReq;
import com.java5.asm.dto.resp.ConversationResp;
import com.java5.asm.dto.resp.MessageOnConversationResp;

import java.util.List;
import java.util.UUID;


public interface ChatService {
    List<ConversationResp> getUserConversations();

    List<MessageOnConversationResp> getMessages(Long conversationId);

    MessageOnConversationResp sendMessage(SendMessageReq req);

    ConversationResp startPrivateChat(UUID senderId, UUID receiverId);

    void acceptMessageRequest(Long conversationId);

    void deleteConversation(Long conversationId);
}
