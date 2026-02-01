package com.java5.asm.controller.chat;

import com.java5.asm.dto.req.SendMessageReq;
import com.java5.asm.dto.req.StartChatReq;
import com.java5.asm.dto.resp.ApiResp;
import com.java5.asm.dto.resp.ConversationResp;
import com.java5.asm.dto.resp.MessageOnConversationResp;
import com.java5.asm.dto.resp.UserFindUserResp;
import com.java5.asm.dto.resp.page.PagedConversationResp;
import com.java5.asm.dto.resp.page.PagedMessageResp;
import com.java5.asm.service.ChatService;
import com.java5.asm.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class ChatController {
    private final ChatService chatService;
    private final UserService userService;

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/conversations")
    public ResponseEntity<ApiResp<List<ConversationResp>>> getConversations() {

        List<ConversationResp> data = chatService.getUserConversations();

        ApiResp<List<ConversationResp>> response = ApiResp.<List<ConversationResp>>builder()
                .code("success")
                .message("Get conversations successfully")
                .data(data)
                .timestamp(LocalDateTime.now().toString())
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     *
     * GET /api/conversations/paged?page=0&size=20
     */
    @PreAuthorize("hasRole('USER')")
    @GetMapping("/conversations/paged")
    public ResponseEntity<ApiResp<PagedConversationResp>> getConversationsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {


        PagedConversationResp data = chatService.getUserConversationsPaged(page, size);

        return ResponseEntity.ok(ApiResp.<PagedConversationResp>builder()
                .code("success")
                .message("Get conversations paged successfully")
                .data(data)
                .timestamp(LocalDateTime.now().toString())
                .build());
    }

    /**
     *
     * GET /api/messages/{conversationId}/paged?page=0&size=50
     */
    @PreAuthorize("hasRole('USER')")
    @GetMapping("/messages/{conversationId}/paged")
    public ResponseEntity<ApiResp<PagedMessageResp>> getMessagesPaged(
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        UUID currentUserId = UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName()
        );

        PagedMessageResp data = chatService.getMessagesPaged(conversationId, currentUserId, page, size);

        return ResponseEntity.ok(ApiResp.<PagedMessageResp>builder()
                .code("success")
                .message("Get messages paged successfully")
                .data(data)
                .timestamp(LocalDateTime.now().toString())
                .build());
    }

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/messages/{conversationId}")
    public ResponseEntity<ApiResp<Object>> getMessage(
            @PathVariable Long conversationId
    ) {

        List<MessageOnConversationResp> data = chatService.getMessages(conversationId);

        return ResponseEntity.ok(
                ApiResp.builder()
                        .code("success")
                        .message("Get messages successfully")
                        .data(data)
                        .timestamp(LocalDateTime.now().toString())
                        .build());
    }


    @PreAuthorize("hasRole('USER')")
    @PostMapping("/messages")
    public ResponseEntity<ApiResp<MessageOnConversationResp>> sendMessage(
            @Valid @RequestBody SendMessageReq req
    ) {

        MessageOnConversationResp data = chatService.sendMessage(req);

        ApiResp<MessageOnConversationResp> response = ApiResp.<MessageOnConversationResp>builder()
                .code("success")
                .message("Gửi tin nhắn thành công")
                .data(data)
                .timestamp(LocalDateTime.now().toString())
                .build();

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('USER')")
    @PostMapping("/conversations/{id}/accept")
    public ResponseEntity<ApiResp<Void>> acceptRequest(@PathVariable Long id) {

        chatService.acceptMessageRequest(id);

        return ResponseEntity.ok(
                ApiResp.<Void>builder()
                        .code("success")
                        .message("Đã chấp nhận yêu cầu nhắn tin")
                        .data(null)
                        .timestamp(LocalDateTime.now().toString())
                        .build()
        );
    }

    @PreAuthorize("hasRole('USER')")
    @PostMapping("/conversations/start")
    public ResponseEntity<ApiResp<ConversationResp>> startChat(@RequestBody StartChatReq req) {
        // req chứa receiverId (UUID)

        // Lấy ID người gửi từ token
        String currentUserIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
        UUID senderId = UUID.fromString(currentUserIdStr);

        ConversationResp data = chatService.startPrivateChat(senderId, req.receiverId());

        return ResponseEntity.ok(
                ApiResp.<ConversationResp>builder()
                        .code("success")
                        .message("Bắt đầu cuộc hội thoại thành công")
                        .data(data)
                        .timestamp(LocalDateTime.now().toString())
                        .build()
        );
    }

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/users/search")
    public ResponseEntity<ApiResp<List<UserFindUserResp>>> searchUsers(@RequestParam String query) {
        // Logic tìm user theo username hoặc email (LIKE %query%)
        // Trả về danh sách user (id, fullName, avatar)
        // Lưu ý: Đừng trả về chính mình
        List<UserFindUserResp> users = userService.searchUsers(query);

        return ResponseEntity.ok(
                ApiResp.<List<UserFindUserResp>>builder()
                        .code("success")
                        .message("Tìm kiếm thành công")
                        .data(users)
                        .timestamp(LocalDateTime.now().toString())
                        .build()
        );
    }

    @PreAuthorize("hasRole('USER')")
    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<ApiResp> deleteConversations(
            @PathVariable Long id
    ) {
        chatService.deleteConversation(id);
        return ResponseEntity.ok().body(ApiResp.<Void>builder()
                .code("success")
                .message("Delete conversation success")
                .timestamp(LocalDateTime.now().toString())
                .build());
    }


}
