package com.java5.asm.exception;

import com.java5.asm.dto.resp.ApiResp;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.stream.Collectors;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(value = RuntimeException.class)
    ResponseEntity<ApiResp<Object>> handleRuntimeException(RuntimeException e) {
        System.out.println("RuntimeException caught: " + e.getMessage());
        ApiResp<Object> apiResp = ApiResp.builder()

                .message(e.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(apiResp);
    }

    // Bắt lỗi VALIDATION (@NotBlank, @Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResp<Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {

        String errorMessages = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(DefaultMessageSourceResolvable::getDefaultMessage)
                .collect(Collectors.joining(", "));
        log.warn("Validation failed: {}", errorMessages);
        ApiResp<Object> apiResp = ApiResp.builder()

                .message(errorMessages)
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

                .message(message)
                .build();

        return ResponseEntity.badRequest().body(apiResp);
    }

    @ExceptionHandler(value = UsernameNotFoundException.class)
    ResponseEntity<ApiResp<Object>> usernameNotFoundException(RuntimeException e) {
        System.out.println("usernameNotFoundException caught: " + e.getMessage());
        ApiResp<Object> apiResp = ApiResp.builder()

                .message("Sai tài khoản hoặc mật khẩu")
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(apiResp);
    }
}
