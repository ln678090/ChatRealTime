package com.java5.asm.service.impl;

import com.java5.asm.dto.resp.UserFindUserResp;
import com.java5.asm.entity.User;
import com.java5.asm.repository.UserRepository;
import com.java5.asm.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

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
}
