package com.java5.asm.config.jwt;

import com.java5.asm.config.custom.CustomUserDetailsService;
import com.java5.asm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtDecoder jwtDecoder;
    private final CustomUserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final TokenStore tokenStore;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {

        String token = extractToken(request);
        if (token == null) return false;
        try {


            Jwt jwt = jwtDecoder.decode(token);
            String userIdStr = jwt.getSubject(); // UUID string
//            String jti = jwt.getId();
//            if (!tokenStore.isJtiAllowed(jti, userIdStr)) {
//                log.warn(" WebSocket blocked: token revoked");
//                return false;
//            }

            var userDetails = userDetailsService.loadUserById(UUID.fromString(userIdStr));
            if (!userDetails.isEnabled()) {
                log.warn(" WebSocket blocked: user locked");
                return false;
            }
            // Tạo Authentication với Principal là CustomUserDetails
            Authentication auth = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities()
            );

            attributes.put("authentication", auth);
            return true;
        } catch (Exception e) {
            log.error(" Handshake failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
    }

    private String extractToken(ServerHttpRequest request) {
        //Ưu tiên lấy từ Query Param (cho Browser WebSocket)
        if (request.getURI().getQuery() != null) {
            String query = request.getURI().getQuery();
            for (String param : query.split("&")) {
                if (param.startsWith("token=")) {
                    return param.substring(6); // Lấy phần sau dấu =
                }
            }
        }

        // 2. Fallback Header (cho Postman/Mobile)
        List<String> auth = request.getHeaders().get("Authorization");
        if (auth != null && !auth.isEmpty()) {
            String h = auth.get(0);
            return h.startsWith("Bearer ") ? h.substring(7) : h;
        }
        return null;
    }
}
