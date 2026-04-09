package com.java5.asm.dto.req;

import jakarta.validation.constraints.NotBlank;

public record UpdateProfileReq(

        @NotBlank(message = "FullName is required")
        String fullName,
        @NotBlank(message = "Address is required")
        String address


) {
}
