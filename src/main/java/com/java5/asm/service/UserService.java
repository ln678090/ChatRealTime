package com.java5.asm.service;

import com.java5.asm.dto.req.UpdateProfileReq;
import com.java5.asm.dto.resp.UserFindUserResp;
import com.java5.asm.dto.resp.UserResp;
import com.java5.asm.entity.User;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface UserService {
    List<UserFindUserResp> searchUsers(String query);

    UserResp getMe();

    User updateProfile(UUID currentUserId, UpdateProfileReq req);

    String uploadAvatar(UUID currentUserId, MultipartFile file);
}
