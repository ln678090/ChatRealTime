package com.java5.asm.security;

import com.java5.asm.config.Argon2idPassword4jEncoder;
import com.java5.asm.config.RedisJtiValidator;
import com.java5.asm.config.RsaKeyConfigProperties;
import com.java5.asm.config.RsaKeyLoader;
import com.java5.asm.entity.User;
import com.java5.asm.repository.UserRepository;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
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
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class WebSecurityConfig {

    private final RsaKeyConfigProperties rsaKeyConfigProperties;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationConverter jwtAuthenticationConverter) throws Exception {

        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers("/api/auth/**", "/ws/**").permitAll();
                    auth.requestMatchers("/api/conversations/**").hasRole("USER");
                    auth.requestMatchers("/api/messages/**").hasRole("USER");
                    auth.requestMatchers("/api/admin/**").hasRole("ADMIN");

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
                )
        ;

        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter(UserRepository userRepository) {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();

        // lấy UUID từ claim "sub"
        converter.setPrincipalClaimName("sub");

        // Custom lại logic chuyển đổi Quyền
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {


            JwtGrantedAuthoritiesConverter defaultConverter = new JwtGrantedAuthoritiesConverter();
            defaultConverter.setAuthoritiesClaimName("roles");
            defaultConverter.setAuthorityPrefix("");

            //  Lấy roles từ token
            Collection<GrantedAuthority> tokenAuthorities = defaultConverter.convert(jwt);

            // tranh null
            if (tokenAuthorities == null) tokenAuthorities = Collections.emptyList();

            //  Kiểm tra xem trong token có ROLE_ADMIN không
            boolean isAdmin = tokenAuthorities.stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));


            // Nếu là Admin  Buộc phải query DB để check lại quyền mới nhất
            if (isAdmin) {
                try {
                    UUID userId = UUID.fromString(jwt.getSubject());
                    // Query DB lấy roles thật
                    return userRepository.findById(userId)
                            .map(User::getRoleNames) // Hàm này trả về Set<String> tên role
                            .orElse(Collections.emptySet())
                            .stream()
                            .map(SimpleGrantedAuthority::new) // Mapping String -> GrantedAuthority
                            .collect(Collectors.toList());

                } catch (Exception e) {
                    // Nếu  user bị xóa, uuid sai,... trả về list rỗng -> Coi như mất quyền
                    return Collections.emptyList();
                }
            }

            //  Nếu là User thường thì  Tin tưởng Token và  Trả về luôn
            return tokenAuthorities;
        });

        return converter;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:5274"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
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
    @Bean
    public JwtDecoder jwtDecoder(RsaKeyConfigProperties props, RedisTemplate<String, String> redisTemplate) throws Exception {
        RSAPublicKey publicKey = RsaKeyLoader.loadPublicKey(props.publicKey());

        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();

        OAuth2TokenValidator<Jwt> withTimestamp = JwtValidators.createDefault();
        OAuth2TokenValidator<Jwt> withRedis = new RedisJtiValidator(redisTemplate);

        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withTimestamp, withRedis));
        return decoder;
    }


    // Encoder để ký token bằng Private Key
    @Bean
    public JwtEncoder jwtEncoder(RsaKeyConfigProperties props) throws Exception {
        RSAPublicKey publicKey = RsaKeyLoader.loadPublicKey(props.publicKey());
        RSAPrivateKey privateKey = RsaKeyLoader.loadPrivateKey(props.privateKey());

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
