package com.java5.asm.controller.aitest;


import com.java5.asm.service.AiChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
//@PreAuthorize("hasRole('USER')")

public class AiTestController {

    private final AiChatService aiChatService;

    // Test: GET /api/ai/test?msg=xin chào
    @PostMapping("/test")
    public ResponseEntity<String> test(@RequestBody Map<String, String> payload) {
        try {
            String msg = payload.get("msg"); // Lấy giá trị của key "msg" từ JSON
            if (msg == null || msg.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("ERROR: msg is missing");
            }
            String result = aiChatService.chat(msg);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("ERROR: " + e.getMessage());
        }
    }
}
