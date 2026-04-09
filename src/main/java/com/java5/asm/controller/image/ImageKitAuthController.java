package com.java5.asm.controller.image;

import com.java5.asm.config.key.ImageKitProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ImageKitAuthController {


    private final ImageKitProperties imageKitProperties;

//    @PreAuthorize("hasRole('USER')")
    @GetMapping("/auth")
    public ResponseEntity<Map<String, Object>> authenticate() {
        try {
            String token = UUID.randomUUID().toString();
            long expire = System.currentTimeMillis() / 1000 + 120;

            // Generate signature
            Mac sha1Hmac = Mac.getInstance("HmacSHA1");
            SecretKeySpec secretKey = new SecretKeySpec(
                    imageKitProperties.getPrivateKey().getBytes(StandardCharsets.UTF_8),
                    "HmacSHA1"
            );
            sha1Hmac.init(secretKey);

            String message = token + expire;
            byte[] signatureBytes = sha1Hmac.doFinal(message.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : signatureBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("signature", hexString.toString());
            response.put("expire", expire);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
