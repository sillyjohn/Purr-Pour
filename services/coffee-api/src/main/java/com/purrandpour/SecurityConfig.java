package com.purrandpour;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * The public edge verifies Clerk sessions and signs the internal hop with a shared
 * secret. This service binds only to loopback. Never expose this port directly.
 */
@Configuration
public class SecurityConfig {
    public record Identity(String id, String role, String name, boolean signedIn) {}

    @Bean
    SecurityFilterChain security(HttpSecurity http) throws Exception {
        String expected = System.getenv("COFFEE_GATEWAY_SECRET");
        if (expected == null || expected.length() < 32) {
            throw new IllegalStateException("COFFEE_GATEWAY_SECRET must be set by the trusted auth edge");
        }
        var filter = new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
                    throws ServletException, IOException {
                String supplied = req.getHeader("X-Coffee-Gateway");
                if (supplied == null || !MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                        supplied.getBytes(StandardCharsets.UTF_8))) {
                    res.sendError(401);
                    return;
                }
                String id = req.getHeader("X-Coffee-Identity");
                if (id == null || !id.matches("(user|guest):[A-Za-z0-9_-]{5,160}")) {
                    res.sendError(401);
                    return;
                }
                String role = req.getHeader("X-Coffee-Role");
                if (!List.of("customer", "staff", "admin").contains(role == null ? "" : role)) role = "customer";
                String name = req.getHeader("X-Coffee-Name");
                boolean signedIn = id.startsWith("user:");
                var identity = new Identity(id, role, name == null ? "Friend" : name, signedIn);
                var auth = new UsernamePasswordAuthenticationToken(identity, null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase())));
                SecurityContextHolder.getContext().setAuthentication(auth);
                chain.doFilter(req, res);
            }
        };
        return http.csrf(csrf -> csrf.disable()) // Same-origin/CSRF checks enforced by the only public auth edge.
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ASYNC, jakarta.servlet.DispatcherType.ERROR).permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/staff/**").hasAnyRole("STAFF", "ADMIN")
                .anyRequest().authenticated())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> { res.setStatus(401); res.setContentType("application/json"); res.getWriter().write("{\"error\":\"Sign in required\"}"); })
                .accessDeniedHandler((req, res, ex) -> { res.setStatus(403); res.setContentType("application/json"); res.getWriter().write("{\"error\":\"Staff access required\"}"); }))
            .addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
