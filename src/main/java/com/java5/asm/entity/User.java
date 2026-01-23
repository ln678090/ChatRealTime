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
    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @ColumnDefault("false")
    @Column(name = "is_online")
    private Boolean isOnline;

    @NotNull
    @ColumnDefault("now()")
    @Column(name = "last_seen", nullable = false)
    private OffsetDateTime lastSeen;

    @NotNull
    @ColumnDefault("now()")
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @NotNull
    @ColumnDefault("true")
    @Column(name = "enabled", nullable = false)
    private Boolean enabled;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UuidCreator.getTimeOrderedEpoch();
        }
    }
    @JsonIgnore
    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<UserRole> userRoles;


    public boolean isEnabled() {
        return enabled;

    }
    @Transient
    public Set<String> getRoleNames() {
        if (userRoles == null) return Collections.emptySet();
        return userRoles.stream()
                .map(ur->ur.getRole().getRoleName())
                .collect(Collectors.toSet());
    }
}