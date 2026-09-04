package com.tms.toolmanagementsystem.controller;

import com.tms.toolmanagementsystem.entity.User;
import com.tms.toolmanagementsystem.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.security.SecureRandom;
import com.tms.toolmanagementsystem.util.JwtUtil;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "${cors.allowed-origins}")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Value("${resend.api-key}")
    private String resendApiKey;

    @Value("${resend.from-email}")
    private String senderEmail;

    private final Map<String, String> otpStorage = new ConcurrentHashMap<>();
    private final Map<String, Long> otpExpiry = new ConcurrentHashMap<>();
    private final Set<String> verifiedResetUsers = ConcurrentHashMap.newKeySet();
    private final SecureRandom secureRandom = new SecureRandom();
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private JwtUtil jwtUtil;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        User dbUser = userRepository.findByUsername(loginRequest.getUsername());
        boolean passwordMatches = false;

        if (dbUser != null && dbUser.getPassword() != null) {
            String rawPassword = loginRequest.getPassword();
            String storedPassword = dbUser.getPassword();

            if (passwordEncoder.matches(rawPassword, storedPassword)) {
                passwordMatches = true;
            } else if (rawPassword.equals(storedPassword)) {
                passwordMatches = true;
                // Upgrade legacy plaintext passwords to bcrypt on first successful login.
                String hashedPassword = passwordEncoder.encode(rawPassword);
                userRepository.updateUserPassword(dbUser.getUsername(), hashedPassword);
            }
        }

        if (passwordMatches) {
            // Generate JWT token
            String token = jwtUtil.generateToken(dbUser);

            Map<String, Object> resp = new HashMap<>();
            resp.put("status", true);
            resp.put("message", "Login Successful");
            resp.put("token", token);
            resp.put("role", dbUser.getRole());
            resp.put("plantId", dbUser.getPlantId());
            resp.put("deptId", dbUser.getDeptId());

            return ResponseEntity.ok(resp);
        }

        return ResponseEntity.status(401).body("{\"status\": false, \"message\": \"Invalid Credentials\"}");
    }

    // 🚀 STEP 1: Generate OTP and send via EMAIL
    @PostMapping("/forgot-password")
    public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        User dbUser = userRepository.findByUsername(username);

        if (dbUser != null && dbUser.getEmail() != null && !dbUser.getEmail().isEmpty()) {
            String toAddress = dbUser.getEmail().trim();
            if (!toAddress.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                return ResponseEntity.badRequest().body("{\"status\": false, \"message\": \"Invalid email address configured for user.\"}");
            }

            String otp = String.format("%04d", secureRandom.nextInt(10000));
            otpStorage.put(username, otp);
            otpExpiry.put(username, System.currentTimeMillis() + 10 * 60 * 1000L);
            verifiedResetUsers.remove(username);

            try {
                Map<String, Object> email = new HashMap<>();
                email.put("from", senderEmail);
                email.put("to", new String[]{toAddress});
                email.put("subject", "TMS Password Reset OTP");
                email.put("text", "Hello " + username + ",\n\nYour OTP to reset your Tool Management System password is: " + otp + "\n\nThis code expires in 10 minutes. If you did not request this, please ignore this email.");

                HttpRequest resendRequest = HttpRequest.newBuilder()
                        .uri(URI.create("https://api.resend.com/emails"))
                        .header("Authorization", "Bearer " + resendApiKey)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(email)))
                        .build();

                HttpResponse<String> resendResponse = httpClient.send(resendRequest, HttpResponse.BodyHandlers.ofString());
                if (resendResponse.statusCode() < 200 || resendResponse.statusCode() >= 300) {
                    otpStorage.remove(username);
                    otpExpiry.remove(username);
                    return ResponseEntity.status(502).body("{\"status\": false, \"message\": \"Failed to send Email.\"}");
                }

                return ResponseEntity.ok("{\"status\": true, \"message\": \"OTP sent to registered email address.\"}");
            } catch (Exception e) {
                otpStorage.remove(username);
                otpExpiry.remove(username);
                return ResponseEntity.status(500).body("{\"status\": false, \"message\": \"Failed to send Email. Server error.\"}");
            }
        }
        return ResponseEntity.badRequest().body("{\"status\": false, \"message\": \"Username not found or no email registered.\"}");
    }

    // 🚀 STEP 2: Verify the typed OTP
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String userOtp = request.get("otp");

        Long expiry = otpExpiry.get(username);
        if (otpStorage.containsKey(username) && expiry != null && expiry > System.currentTimeMillis()
                && otpStorage.get(username).equals(userOtp)) {
            otpStorage.remove(username); // Clear it so it can't be reused
            otpExpiry.remove(username);
            verifiedResetUsers.add(username);
            return ResponseEntity.ok("{\"status\": true, \"message\": \"OTP Verified.\"}");
        }
        if (expiry != null && expiry <= System.currentTimeMillis()) {
            otpStorage.remove(username);
            otpExpiry.remove(username);
        }
        return ResponseEntity.status(401).body("{\"status\": false, \"message\": \"Invalid or Expired OTP.\"}");
    }

    // 🚀 STEP 3: Save the newly created password
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String newPassword = request.get("newPassword");

        if (!verifiedResetUsers.remove(username)) {
            return ResponseEntity.status(401).body("{\"status\": false, \"message\": \"OTP verification required.\"}");
        }

        String hashedPassword = passwordEncoder.encode(newPassword);

        boolean isUpdated = userRepository.updateUserPassword(username, hashedPassword);

        if (isUpdated) {
            return ResponseEntity.ok("{\"status\": true, \"message\": \"Password changed successfully. Please log in.\"}");
        }
        return ResponseEntity.status(500).body("{\"status\": false, \"message\": \"Failed to update password.\"}");
    }
}
