package com.java5.asm.security;

import com.java5.asm.config.redis.RedisConfig;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;
import java.util.stream.Collectors;

@Configuration
@RequiredArgsConstructor
class WebSocketSecurityConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtDecoder jwtDecoder;
    private final RedisTemplate<String, String> redisTemplate;


    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            /**
             * Invoked before the Message is actually sent to the channel.
             * This allows for modification of the Message if necessary.
             * If this method returns {@code null} then the actual
             * send invocation will not occur.
             *
             */
            @Override
            public @NonNull Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null) return message;
                // chi authen khi connet con send hay subsribe dungf usse gan
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = firstNativeHeader(accessor);
                    if (authHeader == null || authHeader.isBlank()) {
                        throw new IllegalArgumentException("Missing Authorization header");
                    }
                    String token = extractBearer(authHeader);
                    //  Verify jwt sig, exp, nbf...
                    Jwt jwt = jwtDecoder.decode(token);

                    //  Check allowlist jti on Redis
                    String jti = jwt.getId();
                    if (jti == null || jti.isBlank()) {
                        throw new IllegalArgumentException("Missing jti in token");
                    }

                    String userId = jwt.getSubject(); // do tui set
                    if (userId == null || userId.isBlank()) {
                        throw new IllegalArgumentException("Missing sub(userId) in token");
                    }

                    // get redisUserId on redis
                    String redisUserId = redisTemplate.opsForValue().get(RedisConfig.KEY_AT_JTI + jti);
                    if (redisUserId == null) {
                        throw new IllegalArgumentException("Token revoked/expired (jti not allowed)");
                    }
                    if (!redisUserId.equals(userId)) {
                        throw new IllegalArgumentException("Token mismatch (jti-user binding invalid)");
                    }

                    //  Build Authentication từ roles claim
                    List<SimpleGrantedAuthority> authorities = extractAuthorities(jwt);

                    var authentication = new UsernamePasswordAuthenticationToken(
                            userId, // principal (string userId) để tiện đồng bộ với REST SecurityContext
                            null,
                            authorities
                    );
                    /* quan trọng
                    set vào accessor.setUser để SimpMessagingTemplate.convertAndSendToUser chạy
                     set SecurityContext để @PreAuthorize trong @MessageMapping có thể dùng
                             NOTE: SecurityContextHolder ở WS thread không luôn ổn định như HTTP,
                    // nhưng set vẫn hữu ích cho code  nếu có dùng.
                    // Nếu  muốn "chuẩn",  có thể dùng spring-security-messaging config riêng.
                    // Ở đây vẫn set cho tiện.
                    // SecurityContextHolder.getContext().setAuthentication(authentication);
                    * */
                    accessor.setUser(authentication);


                }
                return message;
            }
        });
    }

    private static String firstNativeHeader(StompHeaderAccessor accessor) {
        List<String> values = accessor.getNativeHeader("Authorization");
        return (values == null || values.isEmpty()) ? null : values.getFirst();
    }

    private static String extractBearer(String header) {
        String h = header.trim();
        if (h.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return h.substring(7).trim();
        }

        return h;
    }

    private static List<SimpleGrantedAuthority> extractAuthorities(Jwt jwt) {
        Object roles = jwt.getClaims().get("roles");
        if (roles instanceof List<?> list) {
            return list.stream()
                    .map(String::valueOf)
                    .filter(s -> !s.isBlank())
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());
        }
        return List.of();
    }
}
