package com.java5.asm.controller.admin;

import com.java5.asm.dto.req.AdminReq;
import com.java5.asm.dto.resp.ApiResp;
import com.java5.asm.service.admin.AdminBlacklistService;
import com.java5.asm.service.admin.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminUserService userService;
    private final AdminBlacklistService blacklistService;

    @GetMapping("/users")
    public ResponseEntity<ApiResp<Object>> getUsers(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        var data = userService.getUsers(query, status, pageable);

        return ResponseEntity.ok(ApiResp.builder()
                .code("success")
                .message("Lấy danh sách người dùng thành công")
                .data(data)
                .build());
    }


    @PatchMapping("/users/{id}/lock")
    public ResponseEntity<ApiResp<Object>> lockUser(
            @PathVariable UUID id,
            @Valid @RequestBody AdminReq.LockUserReq req,
            @AuthenticationPrincipal Jwt jwt) {

        UUID adminId = UUID.fromString(jwt.getSubject());
        userService.toggleLock(id, req.getLocked(), adminId);

        return ResponseEntity.ok(ApiResp.builder()
                .code("success")
                .message("Thay đổi trạng thái khóa tài khoản thành công")
                .build());
    }

    @PatchMapping("/users/{id}/roles")
    public ResponseEntity<ApiResp<Object>> updateRoles(
            @PathVariable UUID id,
            @Valid @RequestBody AdminReq.UpdateRolesReq req,
            @AuthenticationPrincipal Jwt jwt) {

        UUID adminId = UUID.fromString(jwt.getSubject());
        userService.updateRoles(id, req, adminId);

        return ResponseEntity.ok(ApiResp.builder()
                .code("success")
                .message("Cập nhật phân quyền thành công")
                .build());
    }


    @GetMapping("/blacklist")
    public ResponseEntity<ApiResp<Object>> getBlacklist(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var data = blacklistService.getBlacklist(query, status, pageable);

        return ResponseEntity.ok(ApiResp.builder()
                .code("success")
                .message("Lấy danh sách từ cấm thành công")
                .data(data)
                .build());
    }

    @PostMapping("/blacklist")
    public ResponseEntity<ApiResp<Object>> createBlacklist(
            @Valid @RequestBody AdminReq.BlacklistReq req,
            @AuthenticationPrincipal Jwt jwt) {
        req.setActive(true);

        UUID adminId = UUID.fromString(jwt.getSubject());
        var newWord = blacklistService.createWord(req, adminId);

        return ResponseEntity.ok(ApiResp.builder()
                .code("success")
                .message("Thêm từ khóa cấm thành công")
                .data(newWord)
                .build());
    }

    @PutMapping("/blacklist/{id}")
    public ResponseEntity<ApiResp<Object>> updateBlacklist(
            @PathVariable UUID id,
            @Valid @RequestBody AdminReq.BlacklistReq req,
            @AuthenticationPrincipal Jwt jwt) {

        UUID adminId = UUID.fromString(jwt.getSubject());
        var updatedWord = blacklistService.updateWord(id, req, adminId);

        return ResponseEntity.ok(ApiResp.builder()
                .code("success")
                .message("Cập nhật từ khóa cấm thành công")
                .data(updatedWord)
                .build());
    }

    @PatchMapping("/blacklist/{id}/toggle-active")
    public ResponseEntity<ApiResp<Object>> toggleActiveBlacklist(
            @PathVariable("id") UUID id,
            @RequestBody Map<String, Boolean> req, // Nhận { "isActive": true/false }
            @AuthenticationPrincipal Jwt jwt) {

        UUID adminId = UUID.fromString(jwt.getSubject());
        Boolean isActive = req.get("isActive");

        blacklistService.toggleActive(id, isActive, adminId);

        return ResponseEntity.ok(ApiResp.builder()
                .code("success")
                .message("Thay đổi trạng thái từ cấm thành công")
                .build());
    }

    @PatchMapping("/blacklist/{id}/soft-delete")
    public ResponseEntity<ApiResp<Object>> deleteBlacklist(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {

        UUID adminId = UUID.fromString(jwt.getSubject());
        blacklistService.softDelete(id, adminId);

        return ResponseEntity.ok(ApiResp.builder()
                .code("success")
                .message("Đã xóa mềm từ khóa cấm thành công")
                .build());
    }
}
