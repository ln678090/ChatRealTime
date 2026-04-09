package com.java5.asm.controller;

import com.java5.asm.service.AiChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class ChatAiWebSocketController {
    private final AiChatService aiChatService;
//    private final SimpMessagingTemplate messagingTemplate;

}
