package com.java5.asm.service.impl;

import com.java5.asm.dto.req.SendMessageReq;
import com.java5.asm.dto.resp.ConversationResp;
import com.java5.asm.dto.resp.MessageOnConversationResp;
import com.java5.asm.entity.*;
import com.java5.asm.repository.ConversationRepository;
import com.java5.asm.repository.MessageRepository;
import com.java5.asm.repository.ParticipantRepository;
import com.java5.asm.repository.UserRepository;
import com.java5.asm.service.ChatService;
import com.java5.asm.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
class ChatServiceImpl
        implements ChatService {

    final UserRepository userRepository;
    final ConversationRepository conversationRepository;
    final ParticipantRepository participantRepository;
    final MessageRepository messageRepository;
    private final FriendshipService friendshipService;

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

            if (co.getIsGroup()) { //
                displayName = co.getChatName();
                displayAvatar = "https://maunailxinh.com/wp-content/uploads/2025/06/cropped-avatar-an-danh-38.jpg"; // àm thơi fix cứng

            } else {
                // no group
                Optional<User> optionalUser = participantRepository.findUserByConversationIdAndUserId(co.getId(), currentUserId);
                if (optionalUser.isPresent()) {
                    User otherUser = optionalUser.get();
                    displayName = otherUser.getUsername();
                    displayAvatar = otherUser.getAvatar();
                    isOnline = otherUser.getIsOnline();
                } else {
                    displayName = "Ẩn danh";
                    displayAvatar = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJEPrclJ5MXCjVP8r2pgXqvT8H9rYHIIYAdw&s";
                }
            }
            // get message last
            Optional<Message> optionalLastMessage = messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(co.getId());
            String lastMessageContent = "";
            OffsetDateTime lastMessageTime = null;

            if (optionalLastMessage.isPresent()) {
                Message msg = optionalLastMessage.get();
                if ("IMAGE".equals(msg.getMessageType())) {
                    lastMessageContent = "Đã gửi một ảnh";
                } else if ("FILE".equals(msg.getMessageType())) {
                    lastMessageContent = "Đã gửi một tập tin";
                } else {
                    // Nếu là tin nhắn của chính mình thì thêm chữ "Bạn: "
                    if (msg.getSender().getId().equals(currentUserId)) {
                        lastMessageContent = "Bạn: " + msg.getContent();
                    } else {
                        lastMessageContent = msg.getContent();
                    }
                }
                lastMessageTime = msg.getCreatedAt();
            }

            ConversationResp resp = new ConversationResp(
                    co.getId(),
                    displayName,
                    displayAvatar,
                    co.getIsGroup(),
                    lastMessageContent,
                    lastMessageTime,
                    isOnline,
                    0
            );

            responseList.add(resp);
        }
// sort list of message new
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
                            .messageType(msg.getMessageType())
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
        newMessage.setMessageType(req.getMessageType());
        newMessage.setStatus("SENT");
        newMessage.setCreatedAt(OffsetDateTime.now());

        Message savedMessage = messageRepository.save(newMessage);

        return MessageOnConversationResp.builder()
                .id(savedMessage.getId())
                .content(savedMessage.getContent())
//                .mediaUrl(savedMessage.getMediaUrl())
                .messageType(savedMessage.getMessageType())
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


    private ConversationResp mapToDto(Conversation c, UUID currentUserId) {
        String chatName = c.getChatName();
        String avatar = null;
        boolean isOnline = false;

        // 1-1 lấy info user còn lại để set chatName  avatar  online
        if (!c.getIsGroup()) {
            Participant other = participantRepository
                    .findOtherParticipantWithUser(c.getId(), currentUserId)
                    .orElse(null);

            if (other != null) {
                User u = other.getUser();
                chatName = (u.getFullName() != null && !u.getFullName().isBlank())
                        ? u.getFullName()
                        : u.getUsername();
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

        //   chưa làm read-receipt thì set 0 tạm
        int unreadCount = 0;

        return ConversationResp.builder()
                .conversationId(c.getId())
                .chatName(chatName)
                .avatar(avatar)
                .isGroup(c.getIsGroup())
                .lastMessage(lastMessage)
                .lastMessageTime(lastTime)
                .isOnline(isOnline)
                .unreadCount(unreadCount)

                .build();
    }


}
