package com.java5.asm.controller.user;

import com.java5.asm.dto.req.SaveAvatarReq;
import com.java5.asm.dto.req.UpdateProfileReq;
import com.java5.asm.dto.resp.ApiResp;
import com.java5.asm.entity.User;
import com.java5.asm.repository.UserRepository;
import com.java5.asm.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final UserRepository userRepository;

//    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping("/me")
    public ResponseEntity<ApiResp<Object>> getMe() {
        log.info("Get user info");
        return ResponseEntity.ok(
                ApiResp.builder()
                        .code("success")
                        .message("Get user info successfully")
                        .data(userService.getMe())
                        .timestamp(LocalDateTime.now().toString())
                        .build());
    }

//    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @PutMapping("/me")
    public ResponseEntity<ApiResp<User>> updateProfile(@RequestBody UpdateProfileReq req) {
        UUID currentUserId = UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName()
        );

        User updated = userService.updateProfile(currentUserId, req);

        return ResponseEntity.ok(ApiResp.<User>builder()
                .code("success")
                .message("Profile updated successfully")
                .data(updated)
                .timestamp(LocalDateTime.now().toString())
                .build());
    }

//    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @PostMapping("/me/avatar")
    public ResponseEntity<ApiResp<User>> saveAvatar(@RequestBody SaveAvatarReq req) {
        UUID currentUserId = UUID.fromString(
                SecurityContextHolder.getContext().getAuthentication().getName()
        );

        User user = userRepository.findByIdWithRoles(currentUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setAvatar(req.getUrl());
        userRepository.save(user);

        return ResponseEntity.ok(ApiResp.<User>builder()
                .code("success")
                .message("Avatar saved successfully")
                .data(user)
                .timestamp(LocalDateTime.now().toString())
                .build());
    }
}
