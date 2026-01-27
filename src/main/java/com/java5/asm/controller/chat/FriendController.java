package com.java5.asm.controller.chat;

import com.java5.asm.dto.resp.ApiResp;
import com.java5.asm.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/friends")
public class FriendController {

    private final FriendshipService friendshipService;

    @PreAuthorize("hasRole('USER')")
    @PostMapping("/unfriend")
    public ResponseEntity<ApiResp<Void>> unfriend(@RequestBody Map<String, String> body) {


        // Body json: { "targetUserId": "uuid-cua-ban" }
        String targetIdStr = body.get("targetUserId");
        if (targetIdStr == null) throw new RuntimeException("Thiếu targetUserId");

        friendshipService.unfriend(UUID.fromString(targetIdStr));

        return ResponseEntity.ok(
                ApiResp.<Void>builder()
                        .code("success")
                        .message("un friend success")
                        .timestamp(LocalDateTime.now().toString())
                        .build()
        );
    }
}
