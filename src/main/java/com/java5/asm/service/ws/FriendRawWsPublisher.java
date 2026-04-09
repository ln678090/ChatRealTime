package com.java5.asm.service.ws;

import com.java5.asm.config.ws.WsSessionRegistry;
import com.java5.asm.dto.enumclass.BinaryMessageType;
import com.java5.asm.dto.ws.BinaryMessagePayload;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class FriendRawWsPublisher {

    private final WsSessionRegistry wsSessionRegistry;

    public void push(UUID userId, BinaryMessagePayload payload) throws IOException {
        Set<WebSocketSession> sessions = wsSessionRegistry.get(userId);
        if (sessions == null) return;

        byte[] bytes = payload.encode();
        BinaryMessage msg = new BinaryMessage(ByteBuffer.wrap(bytes));

        for (WebSocketSession s : sessions) {
            try {
                if (s.isOpen()) s.sendMessage(msg);
            } catch (Exception ignored) {
            }
        }
    }

    public static BinaryMessagePayload event(
            String eventType,
            UUID actor,
            UUID target,
            String uiStatus
    ) {
        return BinaryMessagePayload.builder()
                .eventType(BinaryMessageType.FRIEND_EVENT)
                .friendEventType(eventType)
                .actorId(actor)
                .targetId(target)
                .uiStatus(uiStatus)
                .timestamp(System.currentTimeMillis())
                .build();
    }
}
