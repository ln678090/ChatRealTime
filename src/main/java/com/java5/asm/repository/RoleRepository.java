package com.java5.asm.repository;

import com.java5.asm.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, Integer> {
    Optional<Role> findByRoleName(String roleName);


    @Query(value = """
            SELECT ur.user_id, r.role_name
            FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.role_id
            WHERE ur.user_id IN (:userIds)
            """, nativeQuery = true)
    List<Object[]> findRoleNamesByUserIdsNative(@Param("userIds") List<UUID> userIds);
}