package com.java5.asm.config.cloud.controller;


import com.java5.asm.config.cloud.dto.SyncUserDto;
import com.java5.asm.config.cloud.dto.UpdateProfileDto;
import com.java5.asm.config.key.JwtProperties;
import com.java5.asm.config.key.RsaKeyConfigProperties;
import com.java5.asm.entity.User;
import com.java5.asm.repository.RoleRepository;
import com.java5.asm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
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
    @Transactional
    public ResponseEntity<String> syncNewUser(@RequestBody SyncUserDto req, Authentication auth) {
        Jwt jwt = (Jwt) auth.getPrincipal();
        String scope = jwt.getClaim("scope");

        if (!"internal".equals(scope)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not internal request");
        }
        if (!userRepository.existsById(req.getId())) {
            try {
                User user = new User();
                user.setId(req.getId());
                user.setFullName(req.getFullName());

                user.setUsername(req.getUsername() != null
                        ? req.getUsername()
                        : req.getEmail().split("@")[0]);

                user.setEmail(req.getEmail());
                user.setAvatar(req.getAvatar());

                user.setPassword(UUID.randomUUID().toString());
                user.setEnabled(true);

                user.setRoles(Collections.singleton(
                        roleRepository.findByRoleName("ROLE_USER")
                                .orElseThrow(() -> new RuntimeException("Role not found"))
                ));

                userRepository.save(user);

            } catch (Exception e) {
                log.error("[ChatRealTime] Lỗi khi tạo User {}: {}", req.getId(), e.getMessage());
                return ResponseEntity.internalServerError().body("Lỗi đồng bộ");
            }
        }

        return ResponseEntity.ok("Đồng bộ thành công");
    }
    @PutMapping("/sync/profile")
    @Transactional
    public ResponseEntity<String> syncUpdateProfile(
            @RequestBody UpdateProfileDto req,Authentication auth
          ) {

        Jwt jwt = (Jwt) auth.getPrincipal();
        String scope = jwt.getClaim("scope");

        if (!"internal".equals(scope)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Not internal request");
        }

        return userRepository.findById(req.getId()).map(user -> {
            if (req.getFullName() != null) user.setFullName(req.getFullName());
            if (req.getAvatar() != null)   user.setAvatar(req.getAvatar());
            if (req.getAddress() != null)  user.setAddress(req.getAddress());
            userRepository.save(user);
            log.info("[ChatRealTime] Cập nhật profile user {} thành công.", req.getId());
            return ResponseEntity.ok("Cập nhật thành công");
        }).orElseGet(() -> {
            log.warn("[ChatRealTime] User {} không tồn tại để cập nhật.", req.getId());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User không tồn tại");
        });
    }
}