package com.java5.asm.service.impl;

import com.java5.asm.service.AiChatService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
//@RequiredArgsConstructor
@Slf4j
public class AiChatServiceImpl implements AiChatService {

    private final ChatClient chatClient;

    private static final String SYSTEM_PROMPT = """
            Bạn là AI Assistant được tích hợp trong ứng dụng Chat Realtime.
            Hãy trả lời ngắn gọn, hữu ích và thân thiện bằng tiếng Việt.
            Không được tiết lộ thông tin cá nhân của người dùng khác.
            """;

    public AiChatServiceImpl(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder
                .defaultSystem(SYSTEM_PROMPT)
                .build();
    }


    @Override
    public String chat(String userMessage) {
        return chatClient
                .prompt()
                .system(SYSTEM_PROMPT)
                .user(userMessage)
                .call()
                .content();
    }

    @Override
    public Flux<String> chatStream(String userMessage) {
        return chatClient
                .prompt()
                .system(SYSTEM_PROMPT)
                .user(userMessage)
                .stream()
                .content();
    }
}
