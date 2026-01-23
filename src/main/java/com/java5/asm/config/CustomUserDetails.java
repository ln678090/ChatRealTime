package com.java5.asm.config;

import com.java5.asm.entity.User;
import lombok.Getter;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Setter
@Getter

public class CustomUserDetails implements UserDetails {

    private final UUID userId;
    private final String username;
    private final String password;
    private final boolean enabled;
    private final Set<String> roles;

    public CustomUserDetails(UUID userId, String username, String password, boolean enabled, Set<String> roles) {
        this.userId = userId;
        this.username = username;
        this.password = password;
        this.enabled = enabled;
        this.roles = roles;
    }

    public CustomUserDetails(User user) {
        this.userId = user.getId();
        this.username = user.getUsername();
        this.password = user.getPassword();
        this.enabled = user.isEnabled();
        this.roles = user.getRoleNames();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(SimpleGrantedAuthority::new)// ROLE_USER, ROLE_ADMIN
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public String getPassword() {
        return password;
    }
    @Override
    public String getUsername() {
        return username;
    }
    @Override
    public boolean isEnabled() {
        return enabled;
    }


}
