package com.java5.asm.security;

import com.java5.asm.config.Argon2idPassword4jEncoder;
import com.java5.asm.config.RsaKeyConfigProperties;
import com.java5.asm.config.RsaKeyLoader;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class WebSecurityConfig {

    private final RsaKeyConfigProperties rsaKeyConfigProperties;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers("/api/auth/**", "/ws/**").permitAll();
                    auth.requestMatchers("/api/admin/**").hasRole("ADMIN");

                    auth.anyRequest().authenticated();
                })
                .oauth2ResourceServer(
                        oauth2 -> oauth2.jwt(Customizer.withDefaults())
                )
                .sessionManagement(
                        session ->
                                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                ;

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new Argon2idPassword4jEncoder();
    }

    // Decoder để verify token bằng Public Key
    @Bean

    public JwtDecoder jwtDecoder(RsaKeyConfigProperties props) throws Exception {
        RSAPublicKey publicKey = RsaKeyLoader.loadPublicKey(props.publicKey());
        return NimbusJwtDecoder.withPublicKey(publicKey).build();
    }


    // Encoder để ký token bằng Private Key
    @Bean
    public JwtEncoder jwtEncoder(RsaKeyConfigProperties  props) throws Exception {
        RSAPublicKey publicKey = RsaKeyLoader.loadPublicKey(props.publicKey());
        RSAPrivateKey privateKey = RsaKeyLoader.loadPrivateKey(props.privateKey());

        JWK jwk = new RSAKey.Builder(publicKey)
                .privateKey(privateKey)
                .build();

        JWKSource<SecurityContext> jwkSource =
                new ImmutableJWKSet<>(new JWKSet(jwk));

        return new NimbusJwtEncoder(jwkSource);
    }

//    @Bean
//    public AuthenticationManager authenticationManager(
//            UserDetailsService userDetailsService,
//            PasswordEncoder passwordEncoder
//    ) {
//        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
//        provider.setUserDetailsService(userDetailsService);
//        provider.setPasswordEncoder(passwordEncoder);
//        return new ProviderManager(provider);
//    }
@Bean
public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
    return config.getAuthenticationManager();
}


}
