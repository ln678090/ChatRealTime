package com.java5.asm.repository.spec;

import com.java5.asm.entity.User;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

public class UserSpec {

    public static Specification<User> filter(String query, String status) {
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

          
            if (StringUtils.hasText(query)) {
                String likePattern = "%" + query.trim().toLowerCase() + "%";
                predicates.add(
                        cb.or(
                                cb.like(cb.lower(root.get("email")), likePattern),
                                cb.like(cb.lower(root.get("fullName")), likePattern),
                                cb.like(cb.lower(root.get("username")), likePattern)
                        )
                );
            }


            if (StringUtils.hasText(status)) {
                if ("ACTIVE".equalsIgnoreCase(status)) {
                    // Nếu là ACTIVE -> enabled = true
                    predicates.add(cb.isTrue(root.get("enabled")));
                } else if ("LOCKED".equalsIgnoreCase(status)) {
                    // Nếu là LOCKED -> enabled = false
                    predicates.add(cb.isFalse(root.get("enabled")));
                }
            }


            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
