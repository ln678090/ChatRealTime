package com.java5.asm.controller.image;

import com.java5.asm.service.FileUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FileUploadController {

    private final FileUploadService fileUploadService;

    /**
     * GET /api/files/upload-auth
     * Get authentication for file upload
     */
//    @PreAuthorize("hasRole('USER')")
    @GetMapping("/upload-auth")
    public ResponseEntity<Map<String, Object>> getUploadAuth(
            @RequestParam(defaultValue = "/chat-files") String folder
    ) {
        Map<String, Object> auth = fileUploadService.uploadFile(null, folder);
        return ResponseEntity.ok(auth);
    }
}