package com.java5.asm.config.binarymessage;

import com.java5.asm.config.custom.CustomUserDetails;
import com.java5.asm.config.ws.WsSessionRegistry;
import com.java5.asm.dto.ChatMessageDTO;
import com.java5.asm.dto.enumclass.BinaryMessageType;
import com.java5.asm.dto.enumclass.MessageContentType;
import com.java5.asm.dto.ws.BinaryMessagePayload;
import com.java5.asm.entity.BlacklistWord;
import com.java5.asm.entity.Participant;
import com.java5.asm.repository.BlacklistWordRepository;
import com.java5.asm.repository.ParticipantRepository;
import com.java5.asm.service.AiChatService;
import com.java5.asm.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.msgpack.core.MessagePack;
import org.msgpack.core.MessageUnpacker;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RequiredArgsConstructor
@Slf4j
@Component
public class BinaryWebSocketHandler extends org.springframework.web.socket.handler.BinaryWebSocketHandler {

    private final WsSessionRegistry wsSessionRegistry;
    private final ChatService chatService;
    private final ParticipantRepository participantRepository;
    private final AiChatService aiChatService;
    private static final UUID AI_BOT_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");
    private final BlacklistWordRepository blacklistWordRepository;


    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        try {
            Authentication auth = getAuthenticationFromSession(session);
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
                wsSessionRegistry.add(userDetails.getUserId(), session);
                log.info(" WebSocket connected: userId={}, sessionId={}", userDetails.getUserId(), session.getId());
                return;
            }
            log.error(" Invalid authentication, closing connection");
            session.close(CloseStatus.POLICY_VIOLATION);
        } catch (IOException e) {
            log.error("Failed to close invalid session", e);
        }
    }


    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        Authentication auth = getAuthenticationFromSession(session);
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            wsSessionRegistry.remove(userDetails.getUserId(), session);
            log.info(" WebSocket closed: userId={}, status={}", userDetails.getUserId(), status);
        }
    }


    @Override
    protected void handleBinaryMessage(
            @NonNull WebSocketSession session,
            @NonNull BinaryMessage message) {
        try {

//            byte[] payload = message.getPayload().array();
            ByteBuffer buf = message.getPayload();
            byte[] payload = new byte[buf.remaining()];
            buf.get(payload);

            Authentication auth = getAuthenticationFromSession(session);
            if (auth == null || !(auth.getPrincipal() instanceof CustomUserDetails userDetails)) {
                log.error("Unauthenticated WebSocket session");
                session.close(CloseStatus.POLICY_VIOLATION.withReason("Unauthenticated"));
                return;
            }
            if (!userDetails.isEnabled()) {
                log.warn("Blocked message from locked user: {}", userDetails.getUserId());
                session.close(CloseStatus.POLICY_VIOLATION.withReason("Account locked"));
                return;
            }
            UUID senderId = userDetails.getUserId();

            try (MessageUnpacker unpacker = MessagePack.newDefaultUnpacker(payload)) {
                int arraySize = unpacker.unpackArrayHeader();
                int typeCode = unpacker.unpackInt();
                BinaryMessageType type = BinaryMessageType.fromCode(typeCode);

                switch (type) {
                    // ===== WEBRTC =====
                    case CALL_OFFER:
                    case CALL_ANSWER:
                    case ICE_CANDIDATE:
                    case CALL_HANGUP:
                    case CALL_REJECT:
                        handleWebRTCSignaling(unpacker, type, senderId);
                        break;

                    // ===== AI CHAT =====
                    case AI_CHAT_REQUEST:
                        handleAiChatRequest(session, unpacker, senderId);
                        break;

                    // ===== CHAT THƯỜNG =====
                    default:
                        processChatLogic(session, payload, senderId);
                        break;
                }
            }
        } catch (Exception e) {
            log.error("Failed to handle binary message", e);
            sendError(session, e.getMessage());
        }
    }

    /**
     * Xử lý tín hiệu WebRTC: Forward trực tiếp từ Sender -> Receiver
     * Cấu trúc gói tin từ Client: [Type, ConvId, TargetUserId, JsonData]
     */
    private void handleWebRTCSignaling(MessageUnpacker unpacker, BinaryMessageType type, UUID senderId) {
        try {
            // Unpacker đang ở vị trí index 1 (sau Type)

            //  conversationId
            long conversationId = unpackNumber(unpacker);

            //  targetUserId (String) - Người nhận cuộc gọi
            String targetIdStr = unpacker.unpackString();
            UUID targetUserId = UUID.fromString(targetIdStr);

            //  Data Payload (SDP hoặc ICE Candidate JSON)
            String signalingData = unpacker.unpackString();

            log.info(" WebRTC Relay [{}] from {} -> {}", type, senderId, targetUserId);

            // Tìm session người nhận
            Set<WebSocketSession> targetSessions = wsSessionRegistry.get(targetUserId);
            if (targetSessions == null || targetSessions.isEmpty()) {
                log.warn(" Target user {} is offline/not connected", targetUserId);
                return;
            }


            ByteArrayOutputStream out = new ByteArrayOutputStream();
            org.msgpack.core.MessagePacker packer = MessagePack.newDefaultPacker(out);

            packer.packArrayHeader(4);
            packer.packInt(type.getCode());           // [0] Type
            packer.packLong(conversationId);          // [1] ConvId
            packer.packString(senderId.toString());   // [2] SenderId (Người gọi)
            packer.packString(signalingData);         // [3] Data

            packer.flush();
            BinaryMessage relayMsg = new BinaryMessage(ByteBuffer.wrap(out.toByteArray()));

            // Gửi cho tất cả session của người nhận
            for (WebSocketSession s : targetSessions) {
                if (s.isOpen()) {
                    synchronized (s) {
                        s.sendMessage(relayMsg);
                    }
                }
            }

        } catch (Exception e) {
            log.error(" Error relaying WebRTC signal", e);
        }
    }

    /**
     * Logic Chat cũ được tách ra để code gọn hơn
     */
    private void processChatLogic(WebSocketSession session, byte[] payload, UUID senderId) throws Exception {
        log.info(" Received chat message from user: {}", senderId);

        BinaryMessagePayload binaryPayload = parseMessagePack(payload);
        binaryPayload.setSenderId(senderId);
        String originalContent = binaryPayload.getContent();

        boolean hasHighSeverity = false; // Cờ đánh dấu có lỗi cấp 5 không
        String highSeverityWord = "";

        // 1. KIỂM DUYỆT TỪ CẤM (BLACKLIST CHECK)
        if (originalContent != null && !originalContent.startsWith("FILE:") && !originalContent.isEmpty()) {

            List<BlacklistWord> activeBlacklist = blacklistWordRepository.findByIsActiveTrueAndIsDeletedFalse();
            String filteredContent = originalContent;

            for (BlacklistWord word : activeBlacklist) {
                if (filteredContent.toLowerCase().contains(word.getKeyword().toLowerCase())) {
                    int severityLevel = word.getSeverity();

                    if (severityLevel >= 1 && severityLevel <= 5) {
                        // Mức 2,3,4,5: Đều che mờ từ cấm bằng dấu ***
                        String regex = "(?i)" + java.util.regex.Pattern.quote(word.getKeyword());
                        filteredContent = filteredContent.replaceAll(regex, "***");

                        // Nếu là cấp 5, bật cờ để tí nữa cảnh báo người gửi
                        if (severityLevel == 5) {
                            hasHighSeverity = true;
                            highSeverityWord = word.getKeyword(); // Lưu lại từ vi phạm để báo
                        }
                    }
                }
            }

            // Ghi đè nội dung đã che mờ vào payload
            binaryPayload.setContent(filteredContent);
        }

        // Validate
        if (binaryPayload.getConversationId() == null) {
            throw new IllegalArgumentException("conversationId is required");
        }
        if (!chatService.isMemberOfConversation(senderId, binaryPayload.getConversationId())) {
            throw new IllegalArgumentException("Bạn không phải thành viên cuộc hội thoại này");
        }

        // Lưu tin nhắn (Đã bị che mờ ***)
        ChatMessageDTO savedMessage = chatService.saveBinaryMessage(binaryPayload);

        // Broadcast cho tất cả mọi người trong phòng (Họ sẽ thấy ***)
        broadcastMessage(binaryPayload.getConversationId(), savedMessage, binaryPayload.getClientMsgId());

        // 2. GỬI CẢNH BÁO CHO RIÊNG NGƯỜI GỬI (Nếu vi phạm cấp 5)
        if (hasHighSeverity) {
            sendBinarySystemAlert(session, "Tin nhắn của bạn chứa từ ngữ vi phạm nghiêm trọng (" + highSeverityWord + ") và đã bị hệ thống che mờ.");
        }

        log.info(" Message saved and broadcast: messageId={}", savedMessage.getId());
    }

    // Hàm phụ: Gửi cảnh báo hệ thống bằng Binary Message cho 1 session
    private void sendBinarySystemAlert(WebSocketSession session, String errorMessage) {
        try {
            if (session.isOpen()) {

                BinaryMessagePayload alertPayload = BinaryMessagePayload.builder()
                        .eventType(BinaryMessageType.AI_CHAT_ERROR) // code 33
                        .conversationId(0L) // Bắt buộc phải có
                        .senderId(AI_BOT_ID) // Có thể dùng AI_BOT_ID hoặc System ID
                        .messageId(0L) // Bắt buộc
                        .content(errorMessage)
                        .clientMsgId("") // Rỗng nhưng không null
                        .timestamp(System.currentTimeMillis())
                        .contentType(MessageContentType.TEXT) // Bắt buộc phải có
                        .build();

                byte[] encoded = alertPayload.encode();
                synchronized (session) {
                    session.sendMessage(new BinaryMessage(ByteBuffer.wrap(encoded)));
                }
                log.info(" Đã gửi cảnh báo từ ngữ vi phạm xuống client: {}", errorMessage);
            }
        } catch (Exception e) {
            log.error("Failed to send binary alert", e);
        }
    }


    // Các hàm Helper giữ nguyên như cũ
    private long unpackNumber(MessageUnpacker unpacker) throws IOException {
        org.msgpack.core.MessageFormat format = unpacker.getNextFormat();

        return switch (format.getValueType()) {
            case INTEGER -> unpacker.unpackLong();
            case FLOAT -> (long) unpacker.unpackDouble();
            default -> throw new IllegalArgumentException("Expected number, got " + format);
        };
    }

    //  4. Parse MessagePack payload
    private BinaryMessagePayload parseMessagePack(byte[] data) throws IOException {
        try (MessageUnpacker unpacker = MessagePack.newDefaultUnpacker(data)) {
            int arraySize = unpacker.unpackArrayHeader();

            if (arraySize < 8) {
                throw new IllegalArgumentException("Invalid payload array size: " + arraySize);
            }

            BinaryMessagePayload payload = new BinaryMessagePayload();

            // [0] eventType (messageType)
            int eventTypeCode = unpacker.unpackInt();
            payload.setEventType(BinaryMessageType.fromCode(eventTypeCode));

            // [1] conversationId -  Accept both int and float
            payload.setConversationId(unpackNumber(unpacker));

            // [2] senderId (từ client - BỎ QUA, sẽ override)
            String clientSenderId = unpacker.unpackString();
            log.debug(" Client sent senderId: {} (will be overridden by JWT)", clientSenderId);

            // [3] messageId (server set - skip) -  Accept both int and float
            unpackNumber(unpacker);

            // [4] content
            payload.setContent(unpacker.unpackString());

            // [5] clientMsgId
            payload.setClientMsgId(unpacker.unpackString());

            //  [6] timestamp - Accept both int and float
            payload.setTimestamp(unpackNumber(unpacker));

            // [7] metadata (skip nếu null)
            if (!unpacker.tryUnpackNil()) {
                unpacker.skipValue();
            }

            //  [8] contentType (if exists)
            if (arraySize >= 9 && !unpacker.tryUnpackNil()) {
                int contentTypeCode = unpacker.unpackInt();
                payload.setContentType(MessageContentType.fromCode(contentTypeCode));
            } else {
                payload.setContentType(MessageContentType.TEXT); // Default
            }
            //  [9-12] File attachment (if exists)
            if (arraySize >= 13) {
                payload.setAttachmentUrl(unpacker.tryUnpackNil() ? null : unpacker.unpackString());
                payload.setAttachmentType(unpacker.tryUnpackNil() ? null : unpacker.unpackString());
                payload.setAttachmentName(unpacker.tryUnpackNil() ? null : unpacker.unpackString());

                //  attachmentSize
                if (!unpacker.tryUnpackNil()) {
                    payload.setAttachmentSize(unpackNumber(unpacker));
                }
            }
            return payload;
        }
    }

    private void broadcastMessage(Long conversationId, ChatMessageDTO savedMessage, String clientMsgId) {
        try {
            List<Participant> participants = participantRepository.findByConversation_Id(conversationId);

            if (participants.isEmpty()) {
                log.warn(" No participants found for conversationId={}", conversationId);
                return;
            }

            //  Convert messageType string to enum
            MessageContentType contentType = MessageContentType.valueOf(savedMessage.getMessageType());

            // Convert timestamp
            long timestamp = savedMessage.getCreatedAt()
                    .atZoneSameInstant(java.time.ZoneId.systemDefault())
                    .toInstant()
                    .toEpochMilli();

            //  Tạo broadcast payload
            BinaryMessagePayload broadcast = BinaryMessagePayload.builder()
                    .eventType(BinaryMessageType.SEND_MESSAGE)
                    .conversationId(savedMessage.getConversationId())
                    .senderId(savedMessage.getSenderId())
                    .messageId(savedMessage.getId())
                    .content(savedMessage.getContent())
                    .clientMsgId(clientMsgId)
                    .timestamp(timestamp)
                    .contentType(contentType)
                    .attachmentUrl(savedMessage.getAttachmentUrl())
                    .attachmentName(savedMessage.getAttachmentName())
                    .attachmentSize(savedMessage.getAttachmentSize())
                    .attachmentType(savedMessage.getAttachmentType())
                    .build();

            byte[] encodedMsg = broadcast.encode();
            BinaryMessage socketMsg = new BinaryMessage(ByteBuffer.wrap(encodedMsg));

            int sentCount = 0;
            for (Participant p : participants) {
                UUID memberId = p.getUser().getId();
                Set<WebSocketSession> sessions = wsSessionRegistry.get(memberId);

                if (sessions != null && !sessions.isEmpty()) {
                    for (WebSocketSession session : sessions) {
                        if (session.isOpen()) {
                            try {
                                session.sendMessage(socketMsg);
                                sentCount++;

                            } catch (IOException e) {
                                log.error(" Failed to send to user: {}", memberId, e);
                            }
                        }
                    }
                }
            }

            log.info(" Broadcast complete: {}/{} participants received message", sentCount, participants.size());

        } catch (Exception e) {
            log.error(" Failed to broadcast message", e);
        }
    }

    //  6. Send error to client
    private void sendError(WebSocketSession session, String errorMessage) {
        try {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage("{\"error\": \"" + errorMessage + "\"}"));
            }
        } catch (IOException e) {
            log.error(" Failed to send error response", e);
        }
    }

    //  7. Get authentication from session
    private Authentication getAuthenticationFromSession(WebSocketSession session) {
        Object auth = session.getAttributes().get("authentication");
        return (Authentication) auth;
    }

    //  8. Send to specific user (for friend events)
    public void sendToUser(UUID userId, BinaryMessage message) {
        Set<WebSocketSession> sessions = wsSessionRegistry.get(userId);

        if (sessions == null || sessions.isEmpty()) {
            log.debug(" User {} has no active WebSocket sessions", userId);
            return;
        }

        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(message);
                    log.debug("Sent to user: {}", userId);
                } catch (IOException e) {
                    log.error(" Failed to send to user: {}", userId, e);
                }
            }
        }
    }

    // XỬ LÝ AI CHAT REQUEST
    private void handleAiChatRequest(WebSocketSession session, MessageUnpacker unpacker, UUID senderId) {
        try {
            // Đọc theo đúng thứ tự của BinaryMessagePayload
            long conversationId = unpackNumber(unpacker);  // index 1
            unpacker.unpackString();                         // index 2: clientSenderId (bỏ qua - trust JWT)
            unpackNumber(unpacker);                          // index 3: messageId (bỏ qua)
            String userMessage = unpacker.unpackString();    // index 4: content
            String clientMsgId = unpacker.unpackString();    // index 5: clientMsgId

            if (userMessage == null || userMessage.isBlank()) {
                sendError(session, "AI message cannot be empty");
                return;
            }

            log.info("[AI] Request from userId={}, conversationId={}, message={}",
                    senderId, conversationId, userMessage);

            long aiMessageId = System.currentTimeMillis();
            StringBuilder fullResponse = new StringBuilder();

            // Stream response từ AI (Spring AI Flux<String>)
            aiChatService.chatStream(userMessage)
                    .subscribe(
                            // onNext: mỗi chunk gửi về client ngay lập tức
                            chunk -> {
                                if (chunk != null && !chunk.isEmpty()) {
                                    fullResponse.append(chunk);
                                    sendAiChunk(session, conversationId, clientMsgId, aiMessageId, chunk);
                                }
                            },
                            // onError: gửi error event
                            error -> {
                                log.error("[AI] Stream error for userId={}: {}", senderId, error.getMessage());
                                sendAiError(session, conversationId, clientMsgId, error.getMessage());
                            },
                            // onComplete: báo hiệu stream kết thúc
                            () -> {
                                log.info("[AI] Stream complete for userId={}, totalChars={}",
                                        senderId, fullResponse.length());
                                sendAiComplete(session, conversationId, clientMsgId, aiMessageId);
                            }
                    );

        } catch (Exception e) {
            log.error("[AI] Failed to handle AI chat request", e);
            sendError(session, "AI service error: " + e.getMessage());
        }
    }

    // Gửi từng chunk (type = AICHATRESPONSE = 31)
    private void sendAiChunk(WebSocketSession session, long conversationId,
                             String clientMsgId, long aiMessageId, String chunk) {
        try {
            if (!session.isOpen()) return;
            BinaryMessagePayload resp = BinaryMessagePayload.builder()
                    .eventType(BinaryMessageType.AI_CHAT_RESPONSE) // code 31
                    .conversationId(conversationId)
                    .senderId(AI_BOT_ID)
                    .messageId(aiMessageId)
                    .content(chunk)
                    .clientMsgId(clientMsgId)
                    .timestamp(System.currentTimeMillis())
                    .contentType(MessageContentType.TEXT)
                    .build();

            byte[] encoded = resp.encode();
            synchronized (session) {
                session.sendMessage(new BinaryMessage(ByteBuffer.wrap(encoded)));
            }
        } catch (IOException e) {
            log.error("[AI] Failed to send chunk to session={}", session.getId(), e);
        }
    }

    // Gửi tín hiệu AI trả lời xong (type = AICHATCOMPLETE = 32)
    private void sendAiComplete(WebSocketSession session, long conversationId,
                                String clientMsgId, long aiMessageId) {
        try {
            if (!session.isOpen()) return;
            BinaryMessagePayload done = BinaryMessagePayload.builder()
                    .eventType(BinaryMessageType.AI_CHAT_COMPLETE) // code 32
                    .conversationId(conversationId)
                    .senderId(AI_BOT_ID)
                    .messageId(aiMessageId)
                    .content("")
                    .clientMsgId(clientMsgId)
                    .timestamp(System.currentTimeMillis())
                    .contentType(MessageContentType.TEXT)
                    .build();

            synchronized (session) {
                session.sendMessage(new BinaryMessage(ByteBuffer.wrap(done.encode())));
            }
        } catch (IOException e) {
            log.error("[AI] Failed to send complete signal", e);
        }
    }

    // Gửi error event (type = AICHATERROR = 33)
    private void sendAiError(WebSocketSession session, long conversationId,
                             String clientMsgId, String errorMsg) {
        try {
            if (!session.isOpen()) return;
            BinaryMessagePayload err = BinaryMessagePayload.builder()
                    .eventType(BinaryMessageType.AI_CHAT_ERROR) // code 33
                    .conversationId(conversationId)
                    .senderId(AI_BOT_ID)
                    .messageId(0L)
                    .content(errorMsg != null ? errorMsg : "Unknown AI error")
                    .clientMsgId(clientMsgId)
                    .timestamp(System.currentTimeMillis())
                    .contentType(MessageContentType.TEXT)
                    .build();

            synchronized (session) {
                session.sendMessage(new BinaryMessage(ByteBuffer.wrap(err.encode())));
            }
        } catch (IOException e) {
            log.error("[AI] Failed to send error signal", e);
        }
    }
}
