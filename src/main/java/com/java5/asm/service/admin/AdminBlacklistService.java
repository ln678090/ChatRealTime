package com.java5.asm.service.admin;

import com.java5.asm.dto.common.PageResponse;
import com.java5.asm.dto.req.AdminReq;
import com.java5.asm.dto.resp.BlacklistWordDTO;
import com.java5.asm.entity.BlacklistWord;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

public interface AdminBlacklistService {
    PageResponse<BlacklistWordDTO> getBlacklist(String query, String status, Pageable pageable);

    @Transactional
    BlacklistWord createWord(AdminReq.BlacklistReq req, UUID adminId);

    @Transactional
    void softDelete(UUID id, UUID adminId);

    Object updateWord(UUID id, AdminReq.@Valid BlacklistReq req, UUID adminId);

    void toggleActive(UUID id, Boolean isActive, UUID adminId);
}
