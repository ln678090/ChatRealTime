package com.java5.asm.service.admin.impl;

import com.java5.asm.config.jwt.TokenStore;
import com.java5.asm.config.ws.WsSessionRegistry;
import com.java5.asm.dto.common.PageResponse;
import com.java5.asm.dto.req.AdminReq;
import com.java5.asm.dto.resp.UserAdminResp;
import com.java5.asm.entity.Role;
import com.java5.asm.entity.User;
import com.java5.asm.repository.RoleRepository;
import com.java5.asm.repository.UserRepository;
import com.java5.asm.repository.spec.UserSpec;
import com.java5.asm.service.UserPresenceService;
import com.java5.asm.service.admin.AdminUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final TokenStore tokenStore;
    private final WsSessionRegistry wsSessionRegistry;
    private final UserPresenceService userPresenceService;

    @Transactional(readOnly = true)
    public PageResponse<UserAdminResp> getUsers(String query, String status, Pageable pageable) {


        Page<User> page = userRepository.findAll(UserSpec.filter(query, status), pageable);

        if (page.isEmpty()) {
            return PageResponse.of(page.map(u -> UserAdminResp.builder().build()));
        }


        List<UUID> userIds = page.getContent().stream()
                .map(User::getId)
                .collect(Collectors.toList());


        List<Object[]> roleResults = roleRepository.findRoleNamesByUserIdsNative(userIds);


        Map<UUID, Boolean> onlineStatusMap = userPresenceService.checkOnlineStatus(userIds);


        Map<UUID, Set<String>> userRolesMap = new HashMap<>();
        for (Object[] row : roleResults) {
            if (row[0] == null || row[1] == null) continue;

            UUID userId;
            if (row[0] instanceof UUID) {
                userId = (UUID) row[0];
            } else {
                userId = UUID.fromString(row[0].toString());
            }

            String roleName = row[1].toString();
            userRolesMap.computeIfAbsent(userId, k -> new HashSet<>()).add(roleName);
        }

        //  Ráp Role và Online Status vào Response DTO
        Page<UserAdminResp> dtoPage = page.map(user -> {
            Set<String> roles = userRolesMap.getOrDefault(user.getId(), Collections.emptySet());

            // Lấy trạng thái online từ Map (mặc định là false nếu lỗi hoặc không có)
            Boolean isOnline = onlineStatusMap.getOrDefault(user.getId(), false);

            return UserAdminResp.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .avatar(user.getAvatar())
                    .enabled(user.getEnabled())
                    .isOnline(isOnline)
                    .roles(roles)
                    .build();
        });

        return PageResponse.of(dtoPage);
    }

    @Transactional
    @Override
    public void toggleLock(UUID targetId, boolean locked, UUID adminId) {
        User user = userRepository.findById(targetId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getId().equals(adminId)) {
            throw new RuntimeException("Không thể tự khóa tài khoản của chính mình");
        }

        user.setEnabled(!locked); // enabled = false => locked
        userRepository.save(user);

        log.info("AUDIT: Admin [{}] set LOCKED={} cho User [{}]", adminId, locked, targetId);

        if (locked) {

            tokenStore.revokeAllAccessTokensOfUser(targetId.toString());

            wsSessionRegistry.disconnectUser(targetId);
        }
    }

    @Transactional
    @Override
    public void updateRoles(UUID targetId, AdminReq.UpdateRolesReq req, UUID adminId) {
        User user = userRepository.findById(targetId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getId().equals(adminId)) {
            throw new RuntimeException("Không thể tự sửa quyền của chính mình");
        }

        Set<Role> roles = req.getRoles().stream()
                .map(roleName -> roleRepository.findByRoleName(roleName)
                        .orElseThrow(() -> new RuntimeException("Role không tồn tại: " + roleName)))
                .collect(Collectors.toSet());

        user.setRoles(roles);
        userRepository.save(user);

        log.info("AUDIT: Admin [{}] update ROLES={} cho User [{}]", adminId, req.getRoles(), targetId);

        // TODO: Xóa Redis Token để bắt user đăng nhập lại lấy quyền mới
        // tokenStore.revokeAllSessionsOfUser(targetId.toString());
    }

}
