package com.java5.asm.util;

import com.password4j.Argon2Function;
import com.password4j.Password;
import com.password4j.types.Argon2;

public class PasswordUtilArgon2id {
    // Cấu hình Argon2id
    private static final int MEMORY = 65536;       // 64MB
    private static final int ITERATIONS = 3;
    private static final int PARALLELISM = 2;
    private static final int OUTPUT_LENGTH = 32;   // 32 bytes

    // Tạo function Argon2id dùng chung
    private static final Argon2Function ARGON2ID_FUNCTION = Argon2Function.getInstance(
            MEMORY, ITERATIONS, PARALLELISM, OUTPUT_LENGTH, Argon2.ID
    );

    // Hàm mã hóa mật khẩu
    public static String hashPassword(String password) {
        return Password.hash(password)
                .addRandomSalt(16)
                .with(ARGON2ID_FUNCTION)
                .getResult();
    }

    // Hàm kiểm tra mật khẩu
    public static boolean verifyPassword(String rawPassword, String hashedPassword) {
        return Password.check(rawPassword, hashedPassword)
                .with(ARGON2ID_FUNCTION);
    }

//    public static void main(String[] args) {
//        String passmoi=hashPassword("123456");
//
//        System.out.println("passmoi:"+passmoi);
//    }
}
