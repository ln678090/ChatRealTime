package com.java5.asm.exception;

import com.java5.asm.dto.resp.ApiResp;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(value = RuntimeException.class)
    ResponseEntity<ApiResp<Object>> handleRuntimeException(RuntimeException e) {
        System.out.println("RuntimeException caught: " + e.getMessage());
        ApiResp<Object> apiResp = ApiResp.builder()
                .timestamp(String.valueOf(Instant.now()))
                .message(e.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(apiResp);
    }

    // Bắt lỗi VALIDATION (@NotBlank, @Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResp<Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {

        // tên field
        // message
        // nếu trùng field thì lấy msg1
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult()
                .getFieldErrors()) {
            errors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }

        log.warn("Validation failed: {}", errors);

        ApiResp<Object> apiResp = ApiResp.builder()
                .timestamp(String.valueOf(Instant.now()))
                .data(errors)   // trả về map thay vì string
                .message("Validation failed")
                .build();

        return ResponseEntity.badRequest().body(apiResp);
    }


    // Bắt lỗi MISSING BODY hoặc MALFORMED JSON
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResp<Object>> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex) {

        String message = "Request body is required";

        // Phân biệt missing body vs malformed JSON
        if (ex.getMessage() != null) {
            if (ex.getMessage().contains("JSON parse error")) {
                message = "Invalid JSON format";
            } else if (ex.getMessage().contains("Required request body is missing")) {
                message = "Request body is missing";
            }
        }

        log.warn("HttpMessageNotReadableException: {}", ex.getMessage());

        ApiResp<Object> apiResp = ApiResp.builder()
                .timestamp(String.valueOf(Instant.now()))
                .message(message)
                .build();

        return ResponseEntity.badRequest().body(apiResp);
    }

    @ExceptionHandler(value = UsernameNotFoundException.class)
    ResponseEntity<ApiResp<Object>> usernameNotFoundException(RuntimeException e) {
        System.out.println("usernameNotFoundException caught: " + e.getMessage());
        ApiResp<Object> apiResp = ApiResp.builder()
                .timestamp(String.valueOf(Instant.now()))
                .message("Wrong account or password")
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(apiResp);
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    public ResponseEntity<ApiResp<Object>> handleAccessDeniedException(Exception ex) {
        log.error("Access Denied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                ApiResp.builder()
                        .code("forbidden")
                        .message("You do not have permission to access this resource")
                        .timestamp(LocalDateTime.now().toString())
                        .build()
        );
    }
}
