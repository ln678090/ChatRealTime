package com.java5.asm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Value;

import java.io.Serializable;

/**
 * DTO for {@link com.java5.asm.entity.User}
 */
@Value
public class UserDto implements Serializable {
    @NotNull
    @Size(min = 3, max = 50)
    String username;
    @NotNull
    @Size(min = 3, max = 100)
    @Email
    String email;
    @NotNull
    @Size(min = 3, max = 255)
    String password;
    @NotNull
    @Size(max = 100)
    String fullName;
}