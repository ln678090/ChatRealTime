package com.java5.asm.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotNull;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;
import java.util.UUID;

@Getter
@Setter
@EqualsAndHashCode
@Embeddable
public class UserRoleId implements Serializable {
    @Serial
    private static final long serialVersionUID = -1560823217731293113L;
    @NotNull
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @NotNull
    @Column(name = "role_id", nullable = false)
    private Integer roleId;

    public UserRoleId(UUID userId, Integer roleId) {
        this.userId = userId;
        this.roleId = roleId;
    }


    public UserRoleId() {

    }


}