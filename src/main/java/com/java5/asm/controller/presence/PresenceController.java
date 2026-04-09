package com.java5.asm.controller.presence;

import com.java5.asm.dto.resp.ApiResp;
import com.java5.asm.service.UserPresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/presence")
@RequiredArgsConstructor
public class PresenceController {
    private final UserPresenceService presenceService;

    @PostMapping("/heartbeat")
    public ResponseEntity<ApiResp<Object>> heartbeat(Authentication authentication) {

        presenceService.heartbeat();
        return ResponseEntity.ok(ApiResp.builder()
                .code("success")
                .message("Heartbeat successful")
                .timestamp(LocalDateTime.now().toString())
                .build());
    }


    @PostMapping("/check")
    public Map<UUID, Boolean> checkOnline(@RequestBody List<UUID> userIds) {
        return presenceService.checkOnlineStatus(userIds);
    }
}