package com.java5.asm.config.cloud.controller;


import com.java5.asm.config.cloud.dto.SyncUserDto;
import com.java5.asm.config.key.JwtProperties;
import com.java5.asm.config.key.RsaKeyConfigProperties;
import com.java5.asm.entity.User;
import com.java5.asm.repository.RoleRepository;
import com.java5.asm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;
import java.util.Collections;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/internal/users")
@RequiredArgsConstructor
public class InternalUserController {

    private final UserRepository userRepository;
    private final RsaKeyConfigProperties rsaKeyConfigProperties;
    private final RoleRepository roleRepository;

    @PostMapping("/sync")
    @Transactional // Bắt buộc để đảm bảo việc save DB an toàn
    public ResponseEntity<String> syncNewUser(@RequestBody SyncUserDto req, @RequestHeader(value = "X-Internal-Secret", required = false) String providedSecretKey) {
        String expectedSecret = Base64.getEncoder().encodeToString(rsaKeyConfigProperties.privateKey().getEncoded());
//        log.info("[ChatRealTime] Nhận yêu cầu đồng bộ user ID: {}", req.getId());
        if (providedSecretKey == null || !providedSecretKey.equals(expectedSecret)) {
            log.warn("Cảnh báo bảo mật: Có người cố gắng gọi API nội bộ bằng Key sai hoặc không có Key!");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
        }
        // Kiểm tra xem User đã tồn tại trong hệ thống Chat chưa
        if (!userRepository.existsById(req.getId())) {
            try {
                User user = new User();
                user.setId(req.getId());
                user.setFullName(req.getFullName());


                user.setUsername(req.getUsername() != null ? req.getUsername() : req.getEmail().split("@")[0]);
                user.setEmail(req.getEmail());
                user.setAvatar(req.getAvatar());


                user.setPassword(UUID.randomUUID().toString());

                user.setEnabled(true);
                user.setRoles(Collections.singleton(roleRepository.findByRoleName("ROLE_USER").orElseThrow(
                        () -> new RuntimeException("Role not found")
                )));

                userRepository.save(user);

            } catch (Exception e) {
                log.error("[ChatRealTime] Lỗi khi tạo User {}: {}", req.getId(), e.getMessage());
                return ResponseEntity.internalServerError().body("Lỗi đồng bộ");
            }
        } else {
            log.info("[ChatRealTime] User {} đã tồn tại, bỏ qua đồng bộ.", req.getId());
        }

        return ResponseEntity.ok("Đồng bộ thành công");
    }
}