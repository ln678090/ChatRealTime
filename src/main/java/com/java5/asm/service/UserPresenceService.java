package com.java5.asm.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class UserPresenceService {

    private final StringRedisTemplate redisTemplate;

    // Key format: "user:presence:{userId}" -> "lastActiveTimestamp"
    private static final String PRESENCE_KEY_PREFIX = "user:presence:";
    private static final long HEARTBEAT_TTL_SECONDS = 45; // Client ping 30s, TTL 45s (dư 15s cho network lag)

    //  Client gọi API này mỗi 30s để báo "Tao còn sống"
    public void heartbeat() {
        UUID currentUserId = UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName()
        );
        String key = PRESENCE_KEY_PREFIX + currentUserId;
        redisTemplate.opsForValue().set(key, String.valueOf(System.currentTimeMillis()), HEARTBEAT_TTL_SECONDS, TimeUnit.SECONDS);
    }

    //  Lấy trạng thái online của 1 danh sách user (MGET - Lazy Load)
    public Map<UUID, Boolean> checkOnlineStatus(List<UUID> userIds) {
        List<String> keys = userIds.stream()
                .map(id -> PRESENCE_KEY_PREFIX + id)
                .toList();

        List<String> values = redisTemplate.opsForValue().multiGet(keys);

        Map<UUID, Boolean> result = new HashMap<>();
        for (int i = 0; i < userIds.size(); i++) {
            // Nếu có value trong Redis -> Online. Ngược lại -> Offline (do hết TTL tự xóa)
            result.put(userIds.get(i), values.get(i) != null);
        }
        return result;
    }
}
