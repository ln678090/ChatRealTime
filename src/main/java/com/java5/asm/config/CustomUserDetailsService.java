package com.java5.asm.config;

import com.java5.asm.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor
@Service
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        var user = userRepository.findByEmailWithRoles(email)
                .orElseThrow(() -> new RuntimeException("Wrong account or password"));

        // Nếu Role.name của bạn lưu là "ADMIN" / "USER"
        // thì phải convert thành "ROLE_ADMIN" / "ROLE_USER"
        return new CustomUserDetails(
                user
        );
    }
}
