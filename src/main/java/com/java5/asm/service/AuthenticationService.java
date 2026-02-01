package com.java5.asm.service;

import com.java5.asm.dto.req.LoginRequest;
import com.java5.asm.dto.req.RegisterReq;
import com.java5.asm.dto.resp.ApiResp;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;

public interface AuthenticationService {
    ResponseEntity<ApiResp<Object>> login(@Valid LoginRequest request);

    ResponseEntity<ApiResp<Object>> refreshToken(String refreshToken);

    ResponseEntity<ApiResp<Object>> logout(String refreshToken, String authHeader);

    ResponseEntity<ApiResp<Object>> register(@Valid RegisterReq req);


}
