package com.java5.asm.dto.resp;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@Builder
public class UserAdminResp {
    private UUID id;
    private String username;
    private String email;
    private String fullName;
    private String avatar;
    private Boolean enabled;
    private Set<String> roles;
    private Boolean isOnline;

}
