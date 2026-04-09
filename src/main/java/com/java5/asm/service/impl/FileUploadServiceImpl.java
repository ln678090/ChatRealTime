package com.java5.asm.service.impl;

import com.java5.asm.config.key.ImageKitProperties;
import com.java5.asm.dto.enumclass.MessageContentType;
import com.java5.asm.service.FileUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class FileUploadServiceImpl implements FileUploadService {
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private final ImageKitProperties imageKitProperties;

    /**
     * @param file
     * @param folder
     * @return
     */

    @Override
    public Map<String, Object> uploadFile(MultipartFile file, String folder) {
        try {
            //  Generate ImageKit Auth Token (file can be null for auth-only request)
            String token = UUID.randomUUID().toString();
            long expire = System.currentTimeMillis() / 1000 + 600;// 10 minutes

            // Generate signature
            Mac sha1Hmac = Mac.getInstance("HmacSHA1");
            SecretKeySpec secretKey = new SecretKeySpec(
                    imageKitProperties.getPrivateKey().getBytes(StandardCharsets.UTF_8),
                    "HmacSHA1"
            );
            sha1Hmac.init(secretKey);

            String message = token + expire;
            byte[] signatureBytes = sha1Hmac.doFinal(message.getBytes(StandardCharsets.UTF_8));

            // Convert to hex
            StringBuilder hexString = new StringBuilder();
            for (byte b : signatureBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }

            // Return auth data
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("signature", hexString.toString());
            response.put("expire", expire);
            response.put("publicKey", imageKitProperties.getPublicKey());
            response.put("urlEndpoint", imageKitProperties.getUrlEndpoint());

            log.info(" Generated ImageKit auth for folder: {}", folder);
            return response;

        } catch (Exception e) {
            log.error(" Failed to generate ImageKit auth", e);
            throw new RuntimeException("Failed to generate upload auth", e);
        }
    }

    //  Detect message type from file MIME type

    public static MessageContentType detectMessageType(String mimeType) {
        if (mimeType == null || mimeType.isEmpty()) {
            return MessageContentType.TEXT;
        }

        String type = mimeType.toLowerCase();

        if (type.startsWith("image/")) {
            return MessageContentType.IMAGE;
        } else if (type.startsWith("video/")) {
            return MessageContentType.VIDEO;
        } else if (type.startsWith("audio/")) {
            return MessageContentType.AUDIO;
        } else if (type.contains("pdf") ||
                type.contains("document") ||
                type.contains("text")) {
            return MessageContentType.FILE;
        } else {
            return MessageContentType.FILE;
        }
    }


//    public Map<String, Object> uploadFile(MultipartFile file, String folder) {
//        // Validate file size
//        if (file.getSize() > MAX_FILE_SIZE) {
//            throw new RuntimeException("File size exceeds 5MB limit");
//        }
//
//        // Generate authentication
//        try {
//            String token = UUID.randomUUID().toString();
//            long expire = System.currentTimeMillis() / 1000 + 120;
//
//            Mac sha1Hmac = Mac.getInstance("HmacSHA1");
//            SecretKeySpec secretKey = new SecretKeySpec(
//                    imageKitProperties.getPrivateKey().getBytes(StandardCharsets.UTF_8),
//                    "HmacSHA1"
//            );
//            sha1Hmac.init(secretKey);
//
//            String message = token + expire;
//            byte[] signatureBytes = sha1Hmac.doFinal(message.getBytes(StandardCharsets.UTF_8));
//
//            StringBuilder hexString = new StringBuilder();
//            for (byte b : signatureBytes) {
//                String hex = Integer.toHexString(0xff & b);
//                if (hex.length() == 1) hexString.append('0');
//                hexString.append(hex);
//            }
//
//            Map<String, Object> result = new HashMap<>();
//            result.put("token", token);
//            result.put("signature", hexString.toString());
//            result.put("expire", expire);
//            result.put("folder", folder);
//
//            return result;
//
//        } catch (Exception e) {
//            throw new RuntimeException("Failed to generate upload auth: " + e.getMessage());
//        }
//    }

    /**
     * @param fileId
     * @return
     */
    @Override
    public boolean deleteFile(String fileId) {
        // Implement delete logic if needed
        return true;
    }


}
