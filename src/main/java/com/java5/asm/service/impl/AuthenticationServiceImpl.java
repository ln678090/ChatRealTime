package com.java5.asm.service.impl;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.java5.asm.config.custom.CustomUserDetails;
import com.java5.asm.config.jwt.TokenService;
import com.java5.asm.config.jwt.TokenStore;
import com.java5.asm.config.key.JwtProperties;
import com.java5.asm.config.redis.RedisConfig;
import com.java5.asm.dto.req.LoginRequest;
import com.java5.asm.dto.req.RegisterReq;
import com.java5.asm.dto.resp.ApiResp;
import com.java5.asm.dto.resp.AuthResponse;
import com.java5.asm.entity.RefreshToken;
import com.java5.asm.entity.User;
import com.java5.asm.mapper.UserMapper;
import com.java5.asm.repository.RoleRepository;
import com.java5.asm.repository.UserRepository;
import com.java5.asm.service.AuthenticationService;
import com.java5.asm.util.HashUtil;
import com.nimbusds.jwt.SignedJWT;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
class AuthenticationServiceImpl implements AuthenticationService {


    private final AuthenticationManager authenticationManager;
    private final TokenService tokenService;
    private final JwtProperties jwtProperties;
    private final UserRepository userRepository;

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final TokenStore tokenStore;

    @Value("${app.google.client-id}")
    private String googleClientId;

    @Transactional
    @Override
    public ResponseEntity<ApiResp<Object>> loginWithGoogle(String idTokenString) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new RuntimeException("Token Google không hợp lệ hoặc đã hết hạn.");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String pictureUrl = (String) payload.get("picture");

            Optional<User> userOptional = userRepository.findByEmailWithRoles(email);
            User user;

            if (userOptional.isPresent()) {
                user = userOptional.get();

                // KIỂM TRA TÀI KHOẢN ĐÃ BỊ KHÓA HAY CHƯA
                // Lưu ý: Đổi getEnabled() thành hàm kiểm tra cờ enable thực tế trong Entity của bạn (ví dụ getIsActive())
                if (user.getEnabled() != null && !user.getEnabled()) {
                    throw new DisabledException("Tài khoản của bạn đã bị vô hiệu hóa.");
                }
            } else {
                user = new User();
                user.setEmail(email);

                // Trường username có thể yêu cầu unique trong DB, lấy phần prefix email hoặc tự sinh UUID
                String prefix = email.contains("@") ? email.split("@")[0] : UUID.randomUUID().toString().substring(0, 8);
                // Đảm bảo username chưa tồn tại
                if (userRepository.findByUsername(prefix).isPresent()) {
                    prefix = prefix + "_" + UUID.randomUUID().toString().substring(0, 4);
                }
                user.setUsername(prefix);

                user.setFullName(name);
                user.setAvatar(pictureUrl);
                user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));

                // Gán Role mặc định
                user.setRoles(Collections.singleton(roleRepository.findByRoleName("ROLE_USER").orElseThrow(
                        () -> new RuntimeException("Role not found")
                )));

                // Mặc định User mới tạo qua Google Login sẽ được bật
                user.setEnabled(true);

                user = userRepository.save(user);
            }

            // Gọi hàm dùng chung để sinh token, lưu Redis và set Cookie Refresh Token
            // Mặc định cho phép rememberMe = true với Google Login để phiên lâu hơn
            return issueTokensAndSetCookie(user, true);

        } catch (DisabledException e) {
            throw e; // Ném thẳng ra ngoài để Global Exception/Controller đón và trả về 403
        } catch (Exception e) {
            log.error("Google Auth error: {}", e.getMessage(), e);
            throw new RuntimeException("Xác thực Google thất bại", e);
        }
    }

    @Transactional
    public ResponseEntity<ApiResp<Object>> login(LoginRequest request) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (isAdmin) {
            log.info("SECURITY AUDIT: Một Admin vừa đăng nhập thành công. Email: {}", request.email());

        } else {
            log.info("User bình thường đăng nhập: {}", request.email());
        }
        String email = ((CustomUserDetails) authentication.getPrincipal()).getUsername();

        var user = userRepository.findByEmailWithRoles(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

//        refreshTokenRepository.deleteByUser(user);

        return issueTokensAndSetCookie(user, request.rememberMe());
    }


    public ResponseEntity<ApiResp<Object>> refreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResp.builder()
                            .code("invalid_refresh_token")
                            .message("Refresh Token is missing in Cookie")
                            .build());
        }

        String limitKey = "refresh-limit:" + HashUtil.sha256(refreshToken);

        int limit = 20; // 20 req / second
        String key = "rl:refresh:" + HashUtil.sha256(refreshToken) + ":" + (System.currentTimeMillis() / 1000);

        Long count = redisTemplate.opsForValue().increment(key); // INCR
        if (count != null && count == 1L) {
            redisTemplate.expire(key, Duration.ofSeconds(2)); // TTL > 1s để an toàn
        }

        if (count != null && count > limit) {
            return ResponseEntity.status(429).body(ApiResp.builder()
                    .code("too_many_requests")
                    .message("Too many refresh requests (max 20/s). Please wait.")
                    .timestamp(String.valueOf(Instant.now()))
                    .build());
        }
        String refreshKey = HashUtil.sha256(refreshToken);
        String userId = redisTemplate.opsForValue().get(RedisConfig.KEY_RT + refreshKey);


        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResp.builder()
                    .code("invalid_refresh_token")
                    .message("Refresh token revoked or expired")
                    .timestamp(String.valueOf(Instant.now()))
                    .build());
        }

        // lấy roles từ cache (fallback DB nếu thiếu)
        String rolesCsv = redisTemplate.opsForValue().get(RedisConfig.KEY_USER + userId);
        if (rolesCsv == null) {
            log.info("rolesCsv == null");
            User user = userRepository.findByIdWithRoles(UUID.fromString(userId))
                    .orElseThrow(() -> new RuntimeException("User not found"));
            cachedUser(user);
            rolesCsv = redisTemplate.opsForValue().get(RedisConfig.KEY_USER + userId);
        }

        var authorities = Arrays.stream(rolesCsv.split(","))
                .filter(s -> !s.isBlank())
                .map(SimpleGrantedAuthority::new)
                .toList();

        var principal = new org.springframework.security.core.userdetails.User(userId, "", authorities);
        Authentication authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);

//        String newAccessToken = tokenService.generateAccessToken(authentication);
//
//        // lưu jti allowlist
//        tokenStore.storeAccessToken(newAccessToken, userId);
        var at = tokenService.generateAccessToken(authentication);
        tokenStore.allowJti(at.jti(), userId);
//        return new AuthResponse(at.token());


        return ResponseEntity.ok
                ().body(ApiResp.builder()
                .code("success")
                .message("Refresh token success")
                .data(new AuthResponse(at.token()))
                .timestamp(String.valueOf(Instant.now()))
                .build())
                ;
    }

    private String extractJtiUnsafe(String token) {
        try {
            return SignedJWT.parse(token).getJWTClaimsSet().getJWTID();
        } catch (Exception e) {
            return null;
        }
    }

    @Transactional
    public ResponseEntity<ApiResp<Object>> logout(String refreshToken, String authHeader) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResp.builder()
                            .code("invalid_refresh_token")
                            .message("Refresh Token is missing in Cookie")
                            .build());
        }
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String accessToken = authHeader.substring(7);
            String jti = extractJtiUnsafe(accessToken);
            if (jti != null) tokenStore.revokeJti(jti);
        }
        String refreshKey = HashUtil.sha256(refreshToken);
        redisTemplate.delete(RedisConfig.KEY_RT + refreshKey);


        ResponseCookie deleteCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(false) // prod => true
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
                .body(ApiResp.builder()
                        .code("success")
                        .message("Logout success")
                        .timestamp(String.valueOf(Instant.now()))
                        .build());
    }

    @Transactional
    public ResponseEntity<ApiResp<Object>> register(@Valid RegisterReq req) {

        User existingUser = userRepository.findByUsername(req.username())
                .orElse(null);

        if (existingUser != null) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(req.email())) {
            return ResponseEntity.badRequest().body(ApiResp.builder()
                    .code("email_exists")
                    .message("Email đã tồn tại")
                    .build());
        }
        User newUser;
        newUser = userMapper.toEntirety(req);
        newUser.setPassword(passwordEncoder.encode(req.password()));
        newUser.setRoles(Collections.singleton(roleRepository.findByRoleName("ROLE_USER").orElseThrow(
                () -> new RuntimeException("Role not found")
        )));
        userRepository.save(newUser);

        return issueTokensAndSetCookie(newUser, false);


    }

    /**
     * @return
     */


    private ResponseEntity<ApiResp<Object>> issueTokensAndSetCookie(User user, boolean rememberMe) {

        cachedUser(user);


        CustomUserDetails userDetails = new CustomUserDetails(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
        );


//        String accessToken = tokenService.generateAccessToken(authentication);


        String refreshToken = tokenService.generateRefreshToken();

//        refreshTokenRepository.deleteByUser(user);
        Duration refreshTtl = rememberMe
                ? jwtProperties.refreshTokenExpiration()
                : Duration.ofDays(7);

        String refreshKey = HashUtil.sha256(refreshToken);
//        String accessKey = HashUtil.sha256(accessToken);
        var at = tokenService.generateAccessToken(authentication);
        tokenStore.allowJti(at.jti(), user.getId().toString());
//        tokenStore.storeAccessToken(accessToken, String.valueOf(user.getId()));
        redisTemplate.opsForValue().set(
                RedisConfig.KEY_RT + refreshKey,
                user.getId().toString(),
                refreshTtl
        );


        RefreshToken rt = new RefreshToken();
        rt.setToken(refreshToken);
        rt.setUser(user);
        rt.setExpiryDate(Instant.now().plusSeconds(refreshTtl.getSeconds()));
        rt.setRevoked(false);
        rt.setCreatedAt(Instant.now());
//        refreshTokenRepository.save(rt);

        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(false) // prod => true
                .path("/")
                .maxAge(refreshTtl)
                .sameSite("Lax")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResp.builder()
                        .code("success")
                        .data(new AuthResponse(at.token()))
                        .message("Login success token time :" + refreshTtl)
                        .timestamp(String.valueOf(Instant.now()))
                        .build());
    }

    public void cachedUser(User user) {
        String userId = user.getId().toString();
        String rolesCsv = user.getUserRoles().stream()
                .map(r -> r.getRole().getRoleName())
                .reduce((a, b) -> a + "," + b)
                .orElse("");

        redisTemplate.opsForValue().set(
                RedisConfig.KEY_USER + userId,
                rolesCsv,
                Duration.ofHours(6)
        );
    }

}