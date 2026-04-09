package com.java5.asm.config.ws;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Slf4j
@Component
public class WsSessionRegistry {

    private final Map<UUID, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    public void add(UUID userId, WebSocketSession session) {
        sessions.computeIfAbsent(userId, k -> new CopyOnWriteArraySet<>()).add(session);
    }

    public void remove(UUID userId, WebSocketSession session) {
        Set<WebSocketSession> set = sessions.get(userId);
        if (set != null) {
            set.remove(session);
            if (set.isEmpty()) sessions.remove(userId);
        }
    }

    public Set<WebSocketSession> get(UUID userId) {
        return sessions.get(userId);
    }

    public void disconnectUser(UUID userId) {
        Set<WebSocketSession> userSessions = sessions.get(userId);

        if (userSessions == null || userSessions.isEmpty()) return;

        for (WebSocketSession session : userSessions) {
            try {
                if (session.isOpen()) {
                    session.close(CloseStatus.POLICY_VIOLATION.withReason("Account locked"));
                }
            } catch (IOException e) {
                log.error("Failed to close WS session for user {}", userId, e);
            }
        }

        sessions.remove(userId);
    }
}
