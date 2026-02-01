package com.java5.asm.service.impl;

import com.java5.asm.dto.req.UpdateProfileReq;
import com.java5.asm.dto.resp.UserFindUserResp;
import com.java5.asm.dto.resp.UserResp;
import com.java5.asm.entity.User;
import com.java5.asm.repository.UserRepository;
import com.java5.asm.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;


    @Override
    public List<UserFindUserResp> searchUsers(String query) {
        String currentUserIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
        UUID currentUserId = UUID.fromString(currentUserIdStr);

        List<User> users = userRepository.searchUsers(query, currentUserId);

        return users.stream()
                .map(u -> new UserFindUserResp(
                        u.getId(),
                        u.getFullName(),
                        u.getUsername(),
                        u.getAvatar(),
                        Boolean.TRUE.equals(u.getIsOnline())
                ))
                .toList();
    }

    @Override
    public UserResp getMe() {
        UUID currentUserId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        User user = userRepository.findByIdWithRoles(currentUserId).orElseThrow(() -> new RuntimeException("User not found"));
        return UserResp.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatar(user.getAvatar())
                .role(user.getRoleNames().stream().findFirst().orElse(null))
                .build();
    }

    /**
     * @param currentUserId
     * @param req
     * @return
     */
    @Override
    @Transactional
    public User updateProfile(UUID currentUserId, UpdateProfileReq req) {

        User user = userRepository.findByIdWithRoles(currentUserId).orElseThrow(() -> new RuntimeException("User not found"));

        user.setFullName(req.fullName());
        user.setAddress(req.address());

        return userRepository.save(user);
    }

    /**
     * @param currentUserId
     * @param file
     * @return
     */
    @Override
    public String uploadAvatar(UUID currentUserId, MultipartFile file) {
        return "";
    }
}
