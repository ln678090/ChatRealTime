package com.java5.asm.controller.chat;

import com.java5.asm.config.BinaryWebSocketHandler;
import com.java5.asm.dto.enumclass.BinaryMessageType;
import com.java5.asm.dto.req.FriendAcceptReq;
import com.java5.asm.dto.req.FriendTargetReq;
import com.java5.asm.dto.resp.ApiResp;
import com.java5.asm.dto.ws.BinaryMessagePayload;
import com.java5.asm.service.FriendshipService;
import com.java5.asm.util.SecurityUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.socket.BinaryMessage;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/friends")
public class FriendController {

    private final FriendshipService friendshipService;
    private final BinaryWebSocketHandler webSocketHandler;

    @PreAuthorize("hasRole('USER')")
    @PostMapping("/add")
    public ResponseEntity<ApiResp<Void>> request(@Valid @RequestBody FriendTargetReq body) throws IOException {
        UUID actorId = SecurityUtil.getCurrentUserId();
        UUID targetId = UUID.fromString(body.targetUserId());

        friendshipService.request(targetId);

        //  GỬI WEBSOCKET EVENT
        sendFriendEvent(actorId, targetId, "PENDING_OUT", "PENDING_IN");

        return ok("Gửi lời mời kết bạn thành công.");
    }

    @PreAuthorize("hasRole('USER')")
    @PostMapping("/cancel")
    public ResponseEntity<ApiResp<Void>> cancel(@Valid @RequestBody FriendTargetReq body) throws IOException {
        UUID actorId = SecurityUtil.getCurrentUserId();
        UUID targetId = UUID.fromString(body.targetUserId());

        friendshipService.cancel(targetId);
        sendFriendEvent(actorId, targetId, "NONE", "NONE");

        return ok("Hủy lời mời kết bạn thành công.");
    }

    @PreAuthorize("hasRole('USER')")
    @PostMapping("/accept")
    public ResponseEntity<ApiResp<Void>> accept(@Valid @RequestBody FriendAcceptReq body) throws IOException {
        UUID actorId = SecurityUtil.getCurrentUserId();
        UUID requesterId = UUID.fromString(body.requesterId());

        friendshipService.accept(requesterId);
        sendFriendEvent(actorId, requesterId, "FRIEND", "FRIEND");

        return ok("Chấp nhận kết bạn thành công.");
    }

    @PreAuthorize("hasRole('USER')")
    @PostMapping("/unfriend")
    public ResponseEntity<ApiResp<Void>> unfriend(@Valid @RequestBody FriendTargetReq body) throws IOException {
        UUID actorId = SecurityUtil.getCurrentUserId();
        UUID targetId = UUID.fromString(body.targetUserId());

        friendshipService.unfriend(targetId);
        sendFriendEvent(actorId, targetId, "NONE", "NONE");

        return ok("Hủy kết bạn thành công.");
    }

    //  HELPER: Gửi Friend Event (DÙNG BinaryMessagePayload)
    private void sendFriendEvent(UUID actorId, UUID targetId, String actorStatus, String targetStatus) throws IOException {
        long now = System.currentTimeMillis();

        // Event cho ACTOR (người thực hiện hành động)
        BinaryMessagePayload actorEvent = BinaryMessagePayload.builder()
                .eventType(BinaryMessageType.FRIEND_EVENT) //  FRIEND_EVENT
                .conversationId(0L)
                .senderId(actorId)
                .messageId(0L)
                .content("")
                .clientMsgId("")
                .timestamp(now)
                .actorId(actorId)
                .targetId(targetId)
                .uiStatus(actorStatus)
                .friendEventType("FRIEND_STATUS_CHANGE")
                .build();

        // Event cho TARGET (người nhận)
        BinaryMessagePayload targetEvent = BinaryMessagePayload.builder()
                .eventType(BinaryMessageType.FRIEND_EVENT)
                .conversationId(0L)
                .senderId(actorId)
                .messageId(0L)
                .content("")
                .clientMsgId("")
                .timestamp(now)
                .actorId(actorId)
                .targetId(targetId)
                .uiStatus(targetStatus)
                .friendEventType("FRIEND_STATUS_CHANGE")
                .build();

        // Encode và gửi
        byte[] actorPayload = actorEvent.encode();
        byte[] targetPayload = targetEvent.encode();

        webSocketHandler.sendToUser(actorId, new BinaryMessage(actorPayload));
        webSocketHandler.sendToUser(targetId, new BinaryMessage(targetPayload));

        log.info("Friend event sent: actor={} ({}), target={} ({})",
                actorId, actorStatus, targetId, targetStatus);
    }

    private ResponseEntity<ApiResp<Void>> ok(String msg) {
        return ResponseEntity.ok(
                ApiResp.<Void>builder()
                        .code("success")
                        .message(msg)
                        .timestamp(LocalDateTime.now().toString())
                        .build()
        );
    }
}
