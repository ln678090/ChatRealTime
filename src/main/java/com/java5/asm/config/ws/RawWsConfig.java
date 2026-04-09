package com.java5.asm.config.ws;

import com.java5.asm.config.jwt.JwtHandshakeInterceptor;
import com.java5.asm.config.binarymessage.BinaryWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class RawWsConfig implements WebSocketConfigurer {

    private final BinaryWebSocketHandler binaryWebSocketHandler;
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(binaryWebSocketHandler, "/ws-binary-chat", "/ws-chat")
                .setAllowedOrigins("*")
                .addInterceptors(jwtHandshakeInterceptor);
    }
}
