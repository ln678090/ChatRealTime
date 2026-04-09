package com.java5.asm.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface FileUploadService {
    Map<String, Object> uploadFile(MultipartFile file, String folder);

    boolean deleteFile(String fileId);
}
