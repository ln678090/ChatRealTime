package com.java5.asm.repository;

import com.java5.asm.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.Limit;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);

    @Query("""
                select u from User u
                left join fetch u.userRoles ur
                left join fetch ur.role r
                where u.username = :username
            """)
    Optional<User> findByUsernameWithRoles(@Param("username") String username);


    @Query("""
                select u from User u
                left join fetch u.userRoles ur
                left join fetch ur.role r
                where u.email = :email
            """)
    Optional<User> findByEmailWithRoles(@Param("email") String email);

    @Query("""
                select u from User u
                left join fetch u.userRoles ur
                left join fetch ur.role r
                where u.id = :id
            """)
    Optional<User> findByIdWithRoles(UUID id);

    boolean existsByEmail(@NotBlank(message = "Email is required") @Email(message = "Invalid email") String email);

    @Query("""
                SELECT u FROM User u
                WHERE (LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')))
                  AND u.id <> :currentUserId
            """)
    List<User> searchUsers(String keyword, UUID currentUserId);

    <T> ScopedValue<T> findById(UUID id, Sort sort, Limit limit);
}
