package com.java5.asm.service;

import reactor.core.publisher.Flux;

public interface AiChatService {
    String chat(String userMessage);

    Flux<String> chatStream(String userMessage);
}
