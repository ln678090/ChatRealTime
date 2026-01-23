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
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        var user = userRepository.findByUsernameWithRoles(username)
                .orElseThrow(() -> new RuntimeException("Sai tài khoản hoặc mật khẩu"));

        // Nếu Role.name của bạn lưu là "ADMIN" / "USER"
        // thì phải convert thành "ROLE_ADMIN" / "ROLE_USER"
        return new CustomUserDetails(
                user.getId(),
                user.getUsername(),
                user.getPassword(),
                user.isEnabled(),
                user.getRoleNames()
        );
    }
}
