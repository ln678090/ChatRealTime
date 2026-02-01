package com.java5.asm.service.impl;

import com.java5.asm.dto.ChatMessageDTO;
import com.java5.asm.dto.enumclass.ConversationStatus;
import com.java5.asm.dto.enumclass.MessageContentType;
import com.java5.asm.dto.req.SendMessageReq;
import com.java5.asm.dto.resp.ConversationResp;
import com.java5.asm.dto.resp.MessageOnConversationResp;
import com.java5.asm.dto.resp.page.PagedConversationResp;
import com.java5.asm.dto.resp.page.PagedMessageResp;
import com.java5.asm.dto.ws.BinaryMessagePayload;
import com.java5.asm.entity.*;
import com.java5.asm.repository.ConversationRepository;
import com.java5.asm.repository.MessageRepository;
import com.java5.asm.repository.ParticipantRepository;
import com.java5.asm.repository.UserRepository;
import com.java5.asm.service.ChatService;
import com.java5.asm.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
class ChatServiceImpl
        implements ChatService {

    final UserRepository userRepository;
    final ConversationRepository conversationRepository;
    final ParticipantRepository participantRepository;
    final MessageRepository messageRepository;
    private final FriendshipService friendshipService;
    private static final int PAGE_SIZE = 50;
    private static final int CONVERSATION_PAGE_SIZE = 30;

    @Override
    public List<ConversationResp> getUserConversations() {
        String userIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
        UUID currentUserId = UUID.fromString(userIdStr);

        List<Conversation> conversations = participantRepository.findConversationsByUserId(currentUserId);
        List<ConversationResp> responseList = new ArrayList<>();

        for (Conversation co : conversations) {
            String displayName;
            String displayAvatar;
            boolean isOnline = false;
            UUID otherUserId = null;
            String otherUserName = null;
            String friendshipStatus = "NONE";
            boolean canMessage = true;
            if (Boolean.TRUE.equals(co.getIsGroup())) {
                // GROUP: giữ nguyên chatName của conversation
                displayName = co.getChatName();
                displayAvatar = "https://maunailxinh.com/wp-content/uploads/2025/06/cropped-avatar-an-danh-38.jpg";
            } else {
                // 1-1: lấy participant còn lại (khuyến nghị dùng method "other participant" để tránh trả nhầm chính mình)
                Participant otherP = participantRepository
                        .findOtherParticipantWithUser(co.getId(), currentUserId)
                        .orElse(null);

                if (otherP != null && otherP.getUser() != null) {
                    User otherUser = otherP.getUser();

                    String fullName = otherUser.getFullName();
                    String name = (fullName != null && !fullName.isBlank())
                            ? fullName
                            : otherUser.getUsername();

                    displayName = fullName;                 //  chatName = fullName
                    otherUserName = otherUser.getUsername();               //  otherUserName = username
                    otherUserId = otherUser.getId();
                    displayAvatar = otherUser.getAvatar();
                    isOnline = Boolean.TRUE.equals(otherUser.getIsOnline());
                } else {
                    displayName = "Ẩn danh";
                    displayAvatar = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJEPrclJ5MXCjVP8r2pgXqvT8H9rYHIIYAdw&s";
                }
            }

            // last message
            Optional<Message> optionalLastMessage =
                    messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(co.getId());

            String lastMessageContent = "";
            OffsetDateTime lastMessageTime = null;

            if (optionalLastMessage.isPresent()) {
                Message msg = optionalLastMessage.get();
                if ("IMAGE".equals(msg.getMessageType())) {
                    lastMessageContent = "Đã gửi một ảnh";
                } else if ("FILE".equals(msg.getMessageType())) {
                    lastMessageContent = "Đã gửi một tập tin";
                } else {
                    //  yêu cầu của bạn: không "Bạn: "
                    lastMessageContent = msg.getContent();
                }
                lastMessageTime = msg.getCreatedAt();
            }

            responseList.add(mapToDto(co, currentUserId));

        }

        // sort desc by lastMessageTime
        responseList.sort(
                Comparator.comparing(ConversationResp::lastMessageTime,
                        Comparator.nullsLast(Comparator.reverseOrder()))
        );

        return responseList;
    }

    @Override
    public List<MessageOnConversationResp> getMessages(Long conversationId) {
        String userIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
        UUID currentUserId = UUID.fromString(userIdStr);

//        boolean isParticipant = participantRepository.existsByConversationIdAndUserId(conversationId, currentUserId);
//        if (!isParticipant) {
//            throw new RuntimeException("Bạn không có quyền xem cuộc hội thoại này");
//        }

        OffsetDateTime joinedAt = participantRepository
                .findJoinedAt(conversationId, currentUserId)
                .orElseThrow(() -> new RuntimeException("Not participant"));

//        List<Message> messages = messageRepository.findAllByConversationIdOrderByCreatedAtAsc(conversationId);
        // get list message before joinedAt
        List<Message> messages = messageRepository.findByConversation_IdAndCreatedAtAfterOrderByCreatedAtAsc(conversationId, joinedAt);

        return messages.stream()
                .map(msg -> {
                    User sender = msg.getSender();
                    boolean isMine = sender.getId().equals(currentUserId);

                    return MessageOnConversationResp.builder()
                            .id(msg.getId())
                            .content(msg.getContent())
                            .mediaUrl(msg.getMediaUrl())
                            .messageType(msg.getMessageType().name())
                            .status(msg.getStatus())
                            .createdAt(msg.getCreatedAt())
                            .senderId(sender.getId().toString())
                            .senderName(sender.getUsername())
                            .senderAvatar(sender.getAvatar())
                            .isMyMessage(isMine)
                            .build();
                }).collect(Collectors.toList());

    }

    @Override
    @Transactional
    public MessageOnConversationResp sendMessage(SendMessageReq req) {
        String userIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
        UUID currentUserId = UUID.fromString(userIdStr);
        User sender = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Conversation conversation = conversationRepository.findById(req.getConversationId())
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        boolean isParticipant = participantRepository.existsByConversationIdAndUserId(req.getConversationId(), currentUserId);
        if (!isParticipant) {
            throw new RuntimeException("Bạn không phải thành viên cuộc hội thoại này");
        }


        // Lấy participant của mình
        Participant senderP = participantRepository
                .findByConversation_IdAndUser_Id(req.getConversationId(), currentUserId)
                .orElseThrow(() -> new RuntimeException("Bạn không thuộc cuộc hội thoại này"));

        if (senderP.getStatus() == ConversationStatus.LEFT) {
            throw new RuntimeException("Bạn đã rời cuộc hội thoại");
        }
        if (senderP.getStatus() == ConversationStatus.BLOCKED) {
            throw new RuntimeException("Bạn đã chặn cuộc hội thoại này, hãy bỏ chặn để nhắn tin.");
        }
        //  Nếu là chat 1-1 thì lấy người còn lại để check họ có block không
        Participant receiverP = null;
        if (!conversation.getIsGroup()) {
            receiverP = participantRepository
                    .findOtherParticipant(req.getConversationId(), currentUserId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy người nhận"));

            if (receiverP.getStatus() == ConversationStatus.BLOCKED) {
                // Option A: báo lỗi thẳng
                throw new RuntimeException("Không thể gửi tin nhắn.");

            }
        }
        // nếu mình đang PENDING mà nhắn -> chuyển ACCEPTED
        if (senderP.getStatus() == ConversationStatus.PENDING) {
            senderP.setStatus(ConversationStatus.ACCEPTED);
            participantRepository.save(senderP);
        }


        Message newMessage = new Message();
        newMessage.setConversation(conversation);
        newMessage.setSender(sender);
        newMessage.setContent(req.getContent());
        newMessage.setMessageType(req.getContentType());
        newMessage.setStatus("SENT");
        newMessage.setCreatedAt(OffsetDateTime.now());

        Message savedMessage = messageRepository.save(newMessage);

        return MessageOnConversationResp.builder()
                .id(savedMessage.getId())
                .content(savedMessage.getContent())
//                .mediaUrl(savedMessage.getMediaUrl())
                .messageType(savedMessage.getMessageType().name())
                .status(savedMessage.getStatus())
                .createdAt(savedMessage.getCreatedAt())
                .senderId(sender.getId().toString())
                .senderName(sender.getFullName())
                .senderAvatar(sender.getAvatar())
                .isMyMessage(true) // Vì chính mình vừa gửi
                .build();
    }

    @Override
    public ConversationResp startPrivateChat(UUID senderId, UUID receiverId) {
        UUID currentUserId = UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName()
        );
        // Tìm conversation 1-1 giữa sender và receiver
        Optional<Conversation> existing = conversationRepository
                .findExistingPrivateConversation(senderId, receiverId);
        if (existing.isPresent()) {
            return mapToDto(existing.get(), currentUserId); // Return luôn cái cũ
        }
        if (friendshipService.isBlocked(receiverId, senderId)) {
            throw new RuntimeException("Bạn không thể nhắn tin cho người này.");
        }
        Conversation conv = new Conversation();
        conv.setIsGroup(false);
        conv.setCreatedAt(OffsetDateTime.now());
        conversationRepository.save(conv);

        // Sender luôn là ACCEPTED
        createParticipant(conv, senderId, ConversationStatus.ACCEPTED);

//        Check xem có phải bạn bè không?
        boolean isFriend = friendshipService.isFriend(senderId, receiverId);
        ConversationStatus receiverStatus = isFriend ? ConversationStatus.ACCEPTED : ConversationStatus.PENDING;

        createParticipant(conv, receiverId, receiverStatus);
        return mapToDto(conv, currentUserId);
    }

    private void createParticipant(Conversation conv, UUID senderId, ConversationStatus conversationStatus) {
        User user = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Participant p = new Participant();
        ParticipantId pid = new ParticipantId(conv.getId(), senderId);
        p.setId(pid);
        p.setConversation(conv);
        p.setUser(user);
        p.setJoinedAt(OffsetDateTime.now());
        p.setRole("MEMBER");
        p.setStatus(conversationStatus);

        participantRepository.save(p);
    }

    //    private ConversationResp mapToDto(Conversation c) {
//        return ConversationResp.builder()
//                .conversationId(c.getId())
//                .chatName(c.getChatName())
//                .avatar(null)
//                .isGroup(c.getIsGroup())
//                .lastMessage(null)
//                .lastMessageTime(null)
//                .isOnline(false)
//                .unreadCount(0)
//                .build();
//    }
    @Override
    @Transactional
    public void acceptMessageRequest(Long conversationId) {
        UUID currentUserId = UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName()
        );

        Participant me = participantRepository
                .findByConversation_IdAndUser_Id(conversationId, currentUserId)
                .orElseThrow(() -> new RuntimeException("Bạn không thuộc cuộc hội thoại này"));

        if (me.getStatus() != ConversationStatus.PENDING) {
            throw new RuntimeException("Không có request để accept");
        }

        me.setStatus(ConversationStatus.ACCEPTED);
        participantRepository.save(me);

        // người gửi request (sender)
        Participant sender = participantRepository
                .findOtherParticipant(conversationId, currentUserId)
                .orElse(null);

        if (sender != null) {
            sender.setStatus(ConversationStatus.ACCEPTED);
            participantRepository.save(sender);
        }
    }

    @Override
    @Transactional
    public void deleteConversation(Long conversationId) {
        String userIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
        UUID currentUserId = UUID.fromString(userIdStr);

        // Kiểm tra xem có trong hội thoại không
        boolean exists = participantRepository.existsByConversationIdAndUserId(conversationId, currentUserId);
        if (!exists) {
            throw new RuntimeException("Bạn không tồn tại trong cuộc hội thoại này");
        }
        // Xóa participant (Xóa bản thân khỏi cuộc hội thoại)
        participantRepository.deleteByConversation_IdAndUser_Id(conversationId, currentUserId);
        //   cuộc hội thoại không còn ai tham gia -> Xóa luôn Conversation và Message để sạch DB
        //  tạm thời chỉ cần xóa participant là user sẽ không thấy chat đó nữa.
    }

    /**
     * @param userId
     * @param conversationId
     * @return
     */
    @Override
    public boolean isMemberOfConversation(UUID userId, Long conversationId) {
        return participantRepository.existsByConversationIdAndUserId(conversationId, userId);
    }


    /**
     * @param payload
     * @return
     */
//    @Override
//    @Transactional
//    public ChatMessageDTO saveBinaryMessage(BinaryMessagePayload payload) {
//        if (payload == null) throw new IllegalArgumentException("payload is null");
//        if (payload.getConversationId() == null) throw new IllegalArgumentException("conversationId is required");
//        if (payload.getSenderId() == null) throw new IllegalArgumentException("senderId is required");
//
//        UUID senderId = payload.getSenderId();
//        Long conversationId = payload.getConversationId();
//
//        // check membership
//        boolean isParticipant = participantRepository.existsByConversationIdAndUserId(conversationId, senderId);
//        if (!isParticipant) {
//            throw new RuntimeException("Bạn không phải thành viên cuộc hội thoại này");
//        }
//
//        User sender = userRepository.findById(senderId)
//                .orElseThrow(() -> new RuntimeException("User not found"));
//
//        Conversation conversation = conversationRepository.findById(conversationId)
//                .orElseThrow(() -> new RuntimeException("Conversation not found"));
//
//        // status checks (LEFT/BLOCKED/PENDING -> ACCEPTED giống sendMessage của bạn)
//        Participant senderP = participantRepository
//                .findByConversation_IdAndUser_Id(conversationId, senderId)
//                .orElseThrow(() -> new RuntimeException("Bạn không thuộc cuộc hội thoại này"));
//
//        if (senderP.getStatus() == ConversationStatus.LEFT) {
//            throw new RuntimeException("Bạn đã rời cuộc hội thoại");
//        }
//        if (senderP.getStatus() == ConversationStatus.BLOCKED) {
//            throw new RuntimeException("Bạn đã chặn cuộc hội thoại này, hãy bỏ chặn để nhắn tin.");
//        }
//        if (senderP.getStatus() == ConversationStatus.PENDING) {
//            senderP.setStatus(ConversationStatus.ACCEPTED);
//            participantRepository.save(senderP);
//        }
//
//        // create Message
//        Message m = new Message();
//        m.setConversation(conversation);
//        m.setSender(sender);
//        m.setContent(payload.getContent());
//        m.setMessageType(payload.getContentType());
//        m.setStatus("SENT");
//        m.setCreatedAt(OffsetDateTime.now());
//
//        Message saved = messageRepository.save(m);
//
//        return messageToDTO(saved, saved.getStatus());
//    }
    // src/main/java/com/java5/asm/service/impl/ChatServiceImpl.java
    @Override
    @Transactional
    public ChatMessageDTO saveBinaryMessage(BinaryMessagePayload payload) {
        if (payload == null) throw new IllegalArgumentException("payload is null");
        if (payload.getConversationId() == null) throw new IllegalArgumentException("conversationId is required");

        UUID senderId = payload.getSenderId();
        Long conversationId = payload.getConversationId();


        parseFileContent(payload);

        // Check membership
        boolean isParticipant = participantRepository.existsByConversationIdAndUserId(conversationId, senderId);
        if (!isParticipant) {
            throw new RuntimeException("Bạn không phải thành viên cuộc hội thoại này");
        }

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        Participant senderP = participantRepository
                .findByConversation_IdAndUser_Id(conversationId, senderId)
                .orElseThrow(() -> new RuntimeException("Bạn không thuộc cuộc hội thoại này"));

        if (senderP.getStatus() == ConversationStatus.LEFT) {
            throw new RuntimeException("Bạn đã rời cuộc hội thoại");
        }
        if (senderP.getStatus() == ConversationStatus.BLOCKED) {
            throw new RuntimeException("Bạn đã chặn cuộc hội thoại này, hãy bỏ chặn để nhắn tin.");
        }
        if (senderP.getStatus() == ConversationStatus.PENDING) {
            senderP.setStatus(ConversationStatus.ACCEPTED);
            participantRepository.save(senderP);
        }


        Message m = new Message();
        m.setConversation(conversation);
        m.setSender(sender);
        m.setContent(payload.getContent());
        m.setMessageType(payload.getContentType());

        m.setMessageType(payload.getContentType() != null ? payload.getContentType() : MessageContentType.TEXT);

        m.setStatus("SENT");
        m.setCreatedAt(OffsetDateTime.now());


        m.setAttachmentUrl(payload.getAttachmentUrl());
        m.setAttachmentName(payload.getAttachmentName());
        m.setAttachmentSize(payload.getAttachmentSize());
        m.setAttachmentType(payload.getAttachmentType());

        Message saved = messageRepository.save(m);

        return messageToDTO(saved);
    }


    private void parseFileContent(BinaryMessagePayload payload) {
        String content = payload.getContent();

        if (content == null || !content.startsWith("FILE:")) {
            return;
        }

        try {
            // Format: FILE:url|name|size|type
            String fileData = content.substring(5);
            String[] parts = fileData.split("\\|");

            if (parts.length >= 4) {
                payload.setAttachmentUrl(parts[0]);
                payload.setAttachmentName(parts[1]);
                payload.setAttachmentSize(Long.parseLong(parts[2]));

                String fileType = parts[3].toUpperCase();
                MessageContentType contentType = switch (fileType) {
                    case "IMAGE" -> MessageContentType.IMAGE;
                    case "VIDEO" -> MessageContentType.VIDEO;
                    case "AUDIO" -> MessageContentType.AUDIO;
                    default -> MessageContentType.FILE;
                };

                payload.setContentType(contentType);
                payload.setContent(""); // Clear content (file info is in separate fields)

                log.info("Parsed file message: type={}, name={}", contentType, parts[1]);
            }
        } catch (Exception e) {
            log.error(" Failed to parse FILE format", e);
        }
    }

    //  Convert Message entity to DTO
    private ChatMessageDTO messageToDTO(Message m) {
        ChatMessageDTO dto = new ChatMessageDTO();
        dto.setId(m.getId());
        dto.setConversationId(m.getConversation().getId());
        dto.setSenderId(m.getSender().getId());
        dto.setSenderName(m.getSender().getUsername());
        dto.setSenderAvatar(m.getSender().getAvatar());
        dto.setContent(m.getContent());
        dto.setCreatedAt(m.getCreatedAt());

        //  MessageType as String (enum.name())
        dto.setMessageType(m.getMessageType().name()); // "TEXT", "IMAGE", "VIDEO", "FILE"

        //  File attachment fields
        dto.setAttachmentUrl(m.getAttachmentUrl());
        dto.setAttachmentName(m.getAttachmentName());
        dto.setAttachmentSize(m.getAttachmentSize());
        dto.setAttachmentType(m.getAttachmentType());

        return dto;
    }


    /**
     * @param messageId
     * @param userId
     */
    @Override
    @Transactional
    public void markAsDelivered(Long messageId, UUID userId) {
//        messageReceiptRepository.findByMessageIdAndRecipientId(messageId, userId)
//                .ifPresent(receipt -> {
//                    receipt.setDeliveredAt(LocalDateTime.now());
//                    messageReceiptRepository.save(receipt);
//                });
    }

    /**
     * @param messageId
     * @param userId
     */
    @Override
    @Transactional
    public void markAsSeen(Long messageId, UUID userId) {
//        messageReceiptRepository.findByMessageIdAndRecipientId(messageId, userId)
//                .ifPresent(receipt -> {
//                    receipt.setSeenAt(LocalDateTime.now());
//                    messageReceiptRepository.save(receipt);
//                });
    }

    /**
     * @param conversationId
     * @param userId
     * @param isTyping
     */
    @Override
    public void publishTypingEvent(Long conversationId, UUID userId, boolean isTyping) {
        Map<String, Object> evt = new HashMap<>();
        evt.put("conversationId", conversationId);
        evt.put("userId", userId.toString());
        evt.put("isTyping", isTyping);
        evt.put("ts", System.currentTimeMillis());

        // Nếu bạn có SimpMessagingTemplate ở service thì inject vào và send:
        // messagingTemplate.convertAndSend("/topic/conversations/" + conversationId + "/typing", evt);
    }

    /**
     * @param page
     * @param size
     * @return
     */
    @Override
    @Transactional(readOnly = true)
    public PagedConversationResp getUserConversationsPaged(int page, int size) {
        UUID currentUserId = UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName()
        );
        Pageable pageable = PageRequest.of(page, size);
        Page<Conversation> conversationPage = participantRepository.findConversationsByUserIdPaged(currentUserId, pageable);

        // Map sang DTO
        List<ConversationResp> items = conversationPage.getContent().stream()
                .map(conv -> mapToDto(conv, currentUserId))
                .collect(Collectors.toList());


        return PagedConversationResp.builder()
                .items(items)
                .currentPage(page)
                .totalPages(conversationPage.getTotalPages())
                .totalItems(conversationPage.getTotalElements())
                .hasNext(conversationPage.hasNext())
                .build();
    }

    /**
     * @param conversationId
     * @param userId
     * @param page
     * @param size
     * @return
     */
    @Override
    @Transactional(readOnly = true)
    public PagedMessageResp getMessagesPaged(Long conversationId, UUID userId, int page, int size) {
        // 1. Check permission
        OffsetDateTime joinedAt = participantRepository
                .findJoinedAt(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("Not participant"));

        // 2. Query messages (DESC order for pagination, latest first)
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messagePage = messageRepository.findMessagesByConversationPaged(
                conversationId,
                joinedAt,
                pageable
        );

        // 3. Map to DTO (reverse để hiển thị ASC - cũ -> mới)
        List<MessageOnConversationResp> items = messagePage.getContent().stream()
                .map(msg -> {
                    User sender = msg.getSender();
                    boolean isMine = sender.getId().equals(userId);


                    return MessageOnConversationResp.builder()
                            .id(msg.getId())
                            .content(msg.getContent())
                            .mediaUrl(msg.getMediaUrl())
                            .messageType(msg.getMessageType().name())
                            .status(msg.getStatus())
                            .createdAt(msg.getCreatedAt())
                            .senderId(sender.getId().toString())
                            .senderName(sender.getUsername())
                            .senderAvatar(sender.getAvatar())
                            .isMyMessage(isMine)


                            .attachmentUrl(msg.getAttachmentUrl())
                            .attachmentName(msg.getAttachmentName())
                            .attachmentSize(msg.getAttachmentSize())
                            .attachmentType(msg.getAttachmentType())

                            .build();
                })
                .collect(Collectors.toList());

        // 4. Reverse order (vì query DESC, nhưng UI cần ASC)
        Collections.reverse(items);

        return PagedMessageResp.builder()
                .items(items)
                .currentPage(page)
                .totalPages(messagePage.getTotalPages())
                .totalItems(messagePage.getTotalElements())
                .hasNext(messagePage.hasNext())
                .build();
    }


    private ConversationResp mapToDto(Conversation c, UUID currentUserId) {
        String chatName = c.getChatName();
        String avatar = null;
        boolean isOnline = false;
        UUID otherUserId = null;
        String otherUserName = null;
        // 1-1 lấy info user còn lại để set chatName  avatar  online
        if (!c.getIsGroup()) {
            Participant other = participantRepository
                    .findOtherParticipantWithUser(c.getId(), currentUserId)
                    .orElse(null);

            if (other != null) {
                User u = other.getUser();
                otherUserId = u.getId();
                otherUserName = u.getUsername();
                chatName = u.getFullName();
                avatar = u.getAvatar();      // hoặc avatarUrl tuỳ
                isOnline = Boolean.TRUE.equals(u.getIsOnline());
            }
        }
//        else {
//            // Group:  group có avatar riêng thì lấy ở conversation
//            avatar = c.getAvatar(); // nếu  có field này
//        }

        // last message
        var lastOpt = messageRepository.findFirstByConversation_IdOrderByCreatedAtDesc(c.getId());
        String lastMessage = lastOpt.map(Message::getContent).orElse(null);
        OffsetDateTime lastTime = lastOpt.map(Message::getCreatedAt).orElse(null);
        String friendshipStatus = "NONE";
        boolean canMessage = true;

        if (!Boolean.TRUE.equals(c.getIsGroup()) && otherUserId != null) {
            friendshipStatus = friendshipService.getUiStatus(currentUserId, otherUserId);

            // nếu bạn muốn chặn nhắn tin khi bị BLOCKED
            canMessage = !"BLOCKED".equals(friendshipStatus);
        }

        //   chưa làm read-receipt thì set 0 tạm
        int unreadCount = 0;

//        ConversationResp.builder().conversationId(c.getId()).chatName().avatar().isGroup().lastMessage().lastMessageTime().isOnline().unreadCount().otherUserId().otherUserName().otherUserAvatar().build();
        ConversationResp.ConversationRespBuilder builder = ConversationResp.builder();
        builder.conversationId(c.getId());
        builder.chatName(chatName);
        builder.avatar(avatar);
        builder.isGroup(c.getIsGroup());
        builder.lastMessage(lastMessage);
        builder.lastMessageTime(lastTime);
        builder.isOnline(isOnline);
        builder.unreadCount(unreadCount);
        builder.otherUserId(otherUserId);
        builder.otherUserName(otherUserName);
        builder.friendshipStatus(friendshipStatus);
        builder.canMessage(canMessage);
        return builder
                .build();
    }

//    private ChatMessageDTO messageToDTO(Message message, String status) {
//        return ChatMessageDTO.builder()
//                .id(message.getId())
//                .conversationId(message.getConversation().getId())
//                .senderId(message.getSender().getId())
//                .content(message.getContent())
//                .messageType(message.getMessageType().name())
//                .status(status)
//                .createdAt(message.getCreatedAt().toLocalDateTime())
//                .build();
//    }

    private MessageOnConversationResp mapMessageToResp(Message msg, UUID currentUserId) {
        // Code mapping hiện tại của bạn
        return MessageOnConversationResp.builder()
                .id(msg.getId())
                .content(msg.getContent())
                .createdAt(msg.getCreatedAt())
                .senderId(msg.getSender().getId().toString())
                .senderName(msg.getSender().getUsername())
                .senderAvatar(msg.getSender().getAvatar())
                .isMyMessage(msg.getSender().getId().equals(currentUserId))
                .build();
    }
}
