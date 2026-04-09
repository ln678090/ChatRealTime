package com.java5.asm.config.cloud.sevice;

import com.java5.asm.config.cloud.dto.ConnectHubApiResp;
import com.java5.asm.config.cloud.dto.UserProfileDto;
import com.java5.asm.config.cloud.key.ConnectHubUrl;
import com.java5.asm.entity.User;
import com.java5.asm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserSyncService {

    private final UserRepository userRepository;
    private final RestClient restClient;
    private ConnectHubUrl   connectHubUrl;

    @Transactional
    public void syncUserIfNeeded(UUID userId, String token) {
        // 1. Nếu User đã có trong DB Chat thì bỏ qua (Không gọi API nữa để tối ưu tốc độ)
        if (userRepository.existsById(userId)) {
            return;
        }

        log.info("[Microservice Sync] User {} chưa có trong Chat DB. Bắt đầu đồng bộ từ ConnectHub...", userId);

        try {
            // 2. Dùng RestClient gọi API sang ConnectHub
            ConnectHubApiResp<UserProfileDto> response = restClient.get()
                    .uri(connectHubUrl + "/api/users/profile/" + userId)
                    .header("Authorization", "Bearer " + token) // Truyền token sang để ConnectHub xác thực
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            // 3. Xử lý kết quả và lưu vào DB Chat
            if (response != null && response.getData() != null) {
                UserProfileDto profile = response.getData();

                User user = new User();
                user.setId(userId);
                user.setFullName(profile.getFullName() != null ? profile.getFullName() : "Người dùng");
                user.setAvatar(profile.getAvatarUrl());
                // Thêm các trường khác nếu entity User bên Chat có...
                user.setEnabled(true);

                userRepository.save(user);
                log.info("[Microservice Sync] Đồng bộ User {} thành công!", userId);
            }
        } catch (Exception e) {
            log.error("[Microservice Sync] Lỗi gọi sang ConnectHub: {}", e.getMessage());
            // Tuỳ nghiệp vụ: Nếu lỗi, bạn có thể lưu 1 User tạm thời hoặc throw Exception để chặn kết nối
        }
    }
}