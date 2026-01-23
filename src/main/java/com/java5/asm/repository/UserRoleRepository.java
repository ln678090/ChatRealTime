package com.java5.asm.repository;

import com.java5.asm.entity.UserRole;
import com.java5.asm.entity.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {
}