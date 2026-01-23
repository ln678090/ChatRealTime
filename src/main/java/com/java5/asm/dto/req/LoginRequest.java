package com.java5.asm.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Tài khoản không được để trống")
        @Size(min = 3, message = "Tài khoản phải có từ 3-50 ký tự", max = 50)
        String username,
        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 3, message = "Mật khẩu phải có từ  3-50 ký tự", max = 50)
        String password
) {
}
