package com.java5.asm.config;

import com.java5.asm.util.PasswordUtilArgon2id;
import org.springframework.security.crypto.password.PasswordEncoder;

public class Argon2idPassword4jEncoder implements PasswordEncoder {
    @Override
    public String encode(CharSequence rawPassword) {
        return PasswordUtilArgon2id.hashPassword(rawPassword.toString());
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        return PasswordUtilArgon2id.verifyPassword(rawPassword.toString(), encodedPassword);
    }
}
