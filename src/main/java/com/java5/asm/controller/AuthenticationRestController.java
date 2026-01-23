package com.java5.asm.controller;

import com.java5.asm.dto.req.LoginRequest;
import com.java5.asm.dto.resp.ApiResp;
import com.java5.asm.service.AuthenticationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@Slf4j
@RequestMapping("/api/auth")
class AuthenticationRestController {

    final AuthenticationService authenticationService;

    @PostMapping("/login")
    public ResponseEntity<ApiResp<Object>> login(@Valid @RequestBody LoginRequest request) {
        log.info("Received login request:");
        return authenticationService.login(request);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResp<Object>> refreshToken(
            @CookieValue(name = "refreshToken", required = false) String refreshToken
    ) {
        log.info("Received refresh token request:");
        return authenticationService.refreshToken(refreshToken);
    }

}
