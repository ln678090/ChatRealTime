package com.java5.asm.service;

import com.java5.asm.dto.resp.UserFindUserResp;

import java.util.List;

public interface UserService {
    List<UserFindUserResp> searchUsers(String query);
}
