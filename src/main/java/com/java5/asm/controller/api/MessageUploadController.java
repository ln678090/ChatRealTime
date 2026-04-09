package com.java5.asm.controller.api;

import com.java5.asm.dto.enumclass.MessageContentType;
import com.java5.asm.service.FileUploadService;
import com.java5.asm.service.impl.FileUploadServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageUploadController {

    private final FileUploadService fileUploadService;

    /**
     * Get ImageKit auth for client-side upload
     */
//    @PreAuthorize("hasRole('USER')")
    @PostMapping("/upload-auth")
    public ResponseEntity<?> getUploadAuth(@RequestParam("conversationId") String conversationId) {
        try {
            // Generate ImageKit auth (no file needed)
            String folder = "/chat-files/" + conversationId;
            Map<String, Object> auth = fileUploadService.uploadFile(null, folder);

            log.info(" Generated upload auth for conversation: {}", conversationId);
            return ResponseEntity.ok(auth);

        } catch (Exception e) {
            log.error(" Failed to generate upload auth", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Validate and return file metadata after client uploaded to ImageKit
     */
    @PreAuthorize("hasRole('USER')")
    @PostMapping("/upload-complete")
    public ResponseEntity<?> uploadComplete(@RequestBody Map<String, Object> payload) {
        try {
            String fileUrl = (String) payload.get("url");
            String fileName = (String) payload.get("name");
            Long fileSize = Long.parseLong(payload.get("size").toString());

            //  ImageKit trả về "fileType" không phải "type"
            String fileType = (String) payload.getOrDefault("fileType", payload.get("type"));

            log.info(" Upload complete payload: url={}, name={}, size={}, fileType={}",
                    fileUrl, fileName, fileSize, fileType);

            if (fileUrl == null || fileUrl.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "File URL is required"));
            }

            // Detect message type
            MessageContentType messageType = FileUploadServiceImpl.detectMessageType(fileType);

            Map<String, Object> result = new HashMap<>();
            result.put("url", fileUrl);
            result.put("name", fileName);
            result.put("size", fileSize);
            result.put("type", fileType);
            result.put("messageType", messageType.name());

            log.info(" File upload completed: {} ({} bytes, type: {})",
                    fileName, fileSize, messageType);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Upload complete failed", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }


}
