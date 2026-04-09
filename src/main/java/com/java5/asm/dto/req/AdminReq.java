package com.java5.asm.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

public class AdminReq {
    @Getter
    @Setter
    public static class LockUserReq {
        @NotNull
        private Boolean locked;
    }

    @Getter
    @Setter
    public static class UpdateRolesReq {
        @NotEmpty(message = "Danh sách quyền không được để trống")
        private Set<String> roles; // VD: ["ROLE_USER", "ROLE_ADMIN"]
    }

    @Getter
    @Setter
    public static class BlacklistReq {
        @NotBlank(message = "Từ khóa không được để trống")
        private String keyword;
        private Integer severity;
        @NotNull
        private Boolean active;
    }
}
