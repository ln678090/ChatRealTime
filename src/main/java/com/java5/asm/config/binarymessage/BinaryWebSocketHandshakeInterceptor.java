package com.java5.asm.config.binarymessage;

import com.java5.asm.config.custom.CustomUserDetailsService;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.handler.WebSocketHandlerDecoratorFactory;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class BinaryWebSocketHandshakeInterceptor implements WebSocketHandlerDecoratorFactory {

    private final JwtDecoder jwtDecoder;
    private final CustomUserDetailsService userDetailsService;


    /**
     * Decorate the given WebSocketHandler.
     *
     * @param handler the handler to be decorated.
     * @return the same handler or the handler wrapped with a subclass of
     * {@code WebSocketHandlerDecorator}
     */
    @Override
    public WebSocketHandler decorate(@NonNull WebSocketHandler handler) {

        return new WebSocketHandlerDecorator(handler) {
 
            @Override
            public void afterConnectionEstablished(@NonNull WebSocketSession session) throws Exception {
                log.info("=== WebSocket Handshake ===");
                log.info("URI: {}", session.getUri());
                log.info("Headers: {}", session.getHandshakeHeaders());
                log.info("Query: {}", session.getUri() != null ? session.getUri().getQuery() : "null");

                String token = extractTokenFromSession(session);
                if (token != null && !token.isEmpty()) {
                    try {
                        var jwt = jwtDecoder.decode(token);
                        String username = jwt.getSubject();
                        UserDetails userDetails = userDetailsService.loadUserById(UUID.fromString(username));
                        Authentication auth = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities()
                        );
                        session.getAttributes().put("authentication", auth);
                        session.getAttributes().put("username", username);
                        log.info(" WebSocket user authenticated: {}", username);
                    } catch (Exception e) {
                        log.error(" WebSocket authentication failed", e);
                        session.close(CloseStatus.POLICY_VIOLATION);
                        return;
                    }
                } else {
                    log.warn(" No token provided in handshake");
                    session.close(CloseStatus.POLICY_VIOLATION);
                    return;
                }
                super.afterConnectionEstablished(session);
            }

        };
    }

    private String extractTokenFromSession(WebSocketSession session) {
        // 1. Đọc từ Query Parameter: ws://...?token=xxx
        if (session.getUri() != null) {
            String query = session.getUri().getQuery();
            if (query != null && !query.isEmpty()) {
                // Parse query string thủ công
                for (String param : query.split("&")) {
                    if (param.startsWith("token=")) {
                        try {
                            // Decode URL-encoded token
                            return java.net.URLDecoder.decode(
                                    param.substring(6),
                                    StandardCharsets.UTF_8
                            );
                        } catch (Exception e) {
                            log.error("Failed to decode token from query", e);
                        }
                    }
                }
            }
        }

        // 2. Fallback: Đọc từ Header (Postman, Mobile app)
        var authHeader = session.getHandshakeHeaders().get("Authorization");
        if (authHeader != null && !authHeader.isEmpty()) {
            String token = authHeader.get(0);
            if (token.startsWith("Bearer ")) {
                return token.substring(7).trim();
            }
        }

        return null;
    }

}
