package com.java5.asm.service.admin;

import com.java5.asm.dto.common.PageResponse;
import com.java5.asm.dto.req.AdminReq;
import com.java5.asm.dto.resp.UserAdminResp;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

public interface AdminUserService {
    PageResponse<UserAdminResp> getUsers(String query, String status, Pageable pageable);

    @Transactional
    void toggleLock(UUID targetId, boolean locked, UUID adminId);

    @Transactional
    void updateRoles(UUID targetId, AdminReq.UpdateRolesReq req, UUID adminId);
}
