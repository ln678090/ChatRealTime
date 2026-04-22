package com.java5.asm.security;

import com.java5.asm.config.custom.Argon2idPassword4jEncoder;
import com.java5.asm.config.redis.RedisJtiValidator;
import com.java5.asm.config.key.RsaKeyConfigProperties;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.List;

@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class
WebSecurityConfig {

    private final RsaKeyConfigProperties rsaKeyConfigProperties;
    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtAuthenticationConverter jwtAuthenticationConverter,
                                                   CorsConfigurationSource corsConfigurationSource) throws Exception {

        http
                .csrf(csrf -> csrf.disable()) //  Bắt buộc dùng csrf.disable() cho REST API Stateless
                .cors(cors -> cors.configurationSource(corsConfigurationSource)) // Trỏ thẳng vào bean CORS
                .authorizeHttpRequests(auth -> {
                    // Đảm bảo OPTIONS (Preflight request) luôn được pass qua để CORS hoạt động
                    auth.requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll();

                    auth.requestMatchers("/api/auth/**", "/ws/**").permitAll();
                    auth.requestMatchers("/api/ai/test").permitAll();
                    auth.requestMatchers("/ws-binary-chat").permitAll();
//                    auth.requestMatchers("/api/internal/users/sync").permitAll();

//                    auth.requestMatchers("/api/conversations/**").hasAnyRole("USER", "ADMIN");
//                    auth.requestMatchers("/api/messages/**").hasAnyRole("USER", "ADMIN");
                    auth.requestMatchers("/api/admin/**").hasRole("ADMIN");
                    auth.requestMatchers("/ws-chat", "/ws-chat/**").permitAll();
                    auth.anyRequest().authenticated();
                })
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .jwtAuthenticationConverter(jwtAuthenticationConverter)
                        )
                )
                .sessionManagement(
                        session ->
                                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                );

        return http.build();
    }

    // ko kiểm tra mọi req admin
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        // Đọc danh sách quyền từ claim "roles" (bạn nạp lúc gen token)
        grantedAuthoritiesConverter.setAuthoritiesClaimName("roles");
        // Xóa prefix mặc định vì lúc gen token bạn đã tự gán "ROLE_" rồi
        grantedAuthoritiesConverter.setAuthorityPrefix("");

        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
        // Đọc "sub" (UUID) để set làm ID của user đang login
        jwtAuthenticationConverter.setPrincipalClaimName("sub");

        return jwtAuthenticationConverter;
    }

    // kiểm  tra all req admin
//    @Bean
//    public JwtAuthenticationConverter jwtAuthenticationConverter(UserRepository userRepository) {
//        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
//
//        // lấy UUID từ claim "sub"
//        converter.setPrincipalClaimName("sub");
//
//        // Custom lại logic chuyển đổi Quyền
//        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
//
// 
//            JwtGrantedAuthoritiesConverter defaultConverter = new JwtGrantedAuthoritiesConverter();
//            defaultConverter.setAuthoritiesClaimName("roles");
//            defaultConverter.setAuthorityPrefix("");
//
//            //  Lấy roles từ token
//            Collection<GrantedAuthority> tokenAuthorities = defaultConverter.convert(jwt);
//
//            // tranh null
//            if (tokenAuthorities == null) tokenAuthorities = Collections.emptyList();
//
//            //  Kiểm tra xem trong token có ROLE_ADMIN không
//            boolean isAdmin = tokenAuthorities.stream()
//                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
//
//
//            // Nếu là Admin  Buộc phải query DB để check lại quyền mới nhất
//            if (isAdmin) {
//                log.info("Admin User login - validating via DB");
//                try {
//                    UUID userId = UUID.fromString(jwt.getSubject());
//                    // Query DB lấy roles thật
//                    return userRepository.findByIdWithRoles(userId)
//                            .map(User::getRoleNames) // Hàm này trả về Set<String> tên role
//                            .orElseThrow(() -> new RuntimeException("Admin user not found in DB!"))
//                            .stream()
//                            .map(SimpleGrantedAuthority::new) // Mapping String -> GrantedAuthority
//                            .collect(Collectors.toList());
//
//                } catch (Exception e) {
//                    log.error("CRITICAL: Failed to load admin roles for subject: {}. Reason: {}", jwt.getSubject(), e.getMessage());
//
//                    return Collections.emptyList();
//
//                }
//            }
//
//            //  Nếu là User thường thì  Tin tưởng Token và  Trả về luôn
//            return tokenAuthorities;
//        });
//
//        return converter;
//    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new Argon2idPassword4jEncoder();
    }

    // Decoder để verify token bằng Public Key
//    @Bean
//    public JwtDecoder jwtDecoder(RsaKeyConfigProperties props, RedisTemplate<String, String> redisTemplate) throws Exception {
////        RSAPublicKey publicKey = RsaKeyLoader.loadPublicKey(props.publicKey());
//        RSAPublicKey publicKey = props.publicKey();
//
//        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();
//
//        OAuth2TokenValidator<Jwt> withTimestamp = JwtValidators.createDefault();
//        OAuth2TokenValidator<Jwt> withRedis = new RedisJtiValidator(redisTemplate);
//
//        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withTimestamp, withRedis));
//        return decoder;
//    }
// Decoder để verify token bằng Public Key
@Bean
public JwtDecoder jwtDecoder(RsaKeyConfigProperties props) throws Exception {
    RSAPublicKey publicKey = props.publicKey();

    NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();

    // Chỉ xác thực Timestamp (thời gian hết hạn expires_at) và Signature
    // Không kiểm tra JTI trên Redis của ChatRealTime nữa vì Token này do ConnectHub cấp
    OAuth2TokenValidator<Jwt> withTimestamp = JwtValidators.createDefault();

    decoder.setJwtValidator(withTimestamp);
    return decoder;
}

    // Encoder để ký token bằng Private Key
    @Bean
    public JwtEncoder jwtEncoder(RsaKeyConfigProperties props) throws Exception {
//        RSAPublicKey publicKey = RsaKeyLoader.loadPublicKey(props.publicKey());
//        RSAPrivateKey privateKey = RsaKeyLoader.loadPrivateKey(props.privateKey());
        RSAPublicKey publicKey = props.publicKey();
        RSAPrivateKey privateKey = props.privateKey();
        JWK jwk = new RSAKey.Builder(publicKey)
                .privateKey(privateKey)
                .build();

        JWKSource<SecurityContext> jwkSource =
                new ImmutableJWKSet<>(new JWKSet(jwk));

        return new NimbusJwtEncoder(jwkSource);
    }


    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }


}
