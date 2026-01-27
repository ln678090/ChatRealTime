package com.java5.asm.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.github.f4b6a3.uuid.UuidCreator;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Getter
@Setter
@Entity
@Table(name = "users")
public class User {
    @Id
    @Column(name = "user_id", nullable = false)
    private UUID id;

    @Size(max = 50)
    @NotNull
    @Column(name = "username", nullable = false, length = 50)
    private String username;

    @Size(max = 100)
    @NotNull
    @Column(name = "email", nullable = false, length = 100)
    private String email;

    @Size(max = 255)
    @NotNull
    @Column(name = "password", nullable = false)
    private String password;

    @Size(max = 100)
    @NotNull
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Size(max = 500)
    @Column(name = "avatar", length = 500)
    private String avatar;

    @ColumnDefault("false")
    @Column(name = "is_online")
    private Boolean isOnline = true;

    @NotNull
    @ColumnDefault("now()")
    @Column(name = "last_seen", nullable = false)
    private OffsetDateTime lastSeen = OffsetDateTime.now();

    @NotNull
    @ColumnDefault("now()")
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @NotNull
    @ColumnDefault("true")
    @Column(name = "enabled", nullable = false)
    private Boolean enabled = true;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UuidCreator.getTimeOrderedEpoch();
        }
    }

    @JsonIgnore
    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<UserRole> userRoles;
    @Size(max = 500)
    @Column(name = "address", length = 500)
    private String address;


    public boolean isEnabled() {
        return enabled;

    }

    @Transient
    public Set<String> getRoleNames() {
        if (userRoles == null) return Collections.emptySet();
        return userRoles.stream()
                .map(ur -> ur.getRole().getRoleName())
                .collect(Collectors.toSet());
    }

    @Transient
    public void setRoles(Set<Role> roles) {
        if (this.userRoles == null) {
            this.userRoles = new java.util.HashSet<>();
        }

        this.userRoles.clear();
        if (roles == null) return;
        // Thêm role mới
        for (Role role : roles) {
            UserRole ur = new UserRole();
            ur.setUser(this);
            ur.setRole(role);
            this.userRoles.add(ur);
        }
    }

}