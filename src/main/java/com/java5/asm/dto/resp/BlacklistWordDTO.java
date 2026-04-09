package com.java5.asm.dto.resp;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;


/**
 * DTO for {@link com.java5.asm.entity.BlacklistWord}
 */

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor(force = true)
public class BlacklistWordDTO implements Serializable {
    UUID id;
    @NotNull
    @Size(max = 255)
    String keyword;
    Integer severity;
    Boolean isActive;
    Boolean isDeleted;
    String creatorName;
}