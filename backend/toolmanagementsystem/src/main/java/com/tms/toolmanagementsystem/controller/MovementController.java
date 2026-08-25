package com.tms.toolmanagementsystem.controller;

import com.tms.toolmanagementsystem.entity.ToolMovement;
import com.tms.toolmanagementsystem.repository.MovementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/movements")
@CrossOrigin(origins = "${cors.allowed-origins}")
public class MovementController {

    @Autowired
    private MovementRepository movementRepository;

    // 🚀 EVICT "tools": A tool was just checked in or out. The dashboard cache is now stale, wipe it!
    @CacheEvict(value = "tools", allEntries = true)
    @PostMapping
    public ResponseEntity<?> recordMovement(@RequestBody ToolMovement movement) {
        if ("SHARPEN_OUT".equals(movement.getMovementType())
                && (movement.getChallanNo() == null || movement.getChallanNo().trim().isEmpty())) {
            return ResponseEntity.badRequest().body("{\"status\": false, \"message\": \"Challan No is required for sharpening transactions\"}");
        }

        if ("STOCK_IN".equals(movement.getMovementType())
                && (movement.getSerials() == null
                || movement.getIssueNumbers() == null
                || movement.getSerials().size() != movement.getIssueNumbers().size()
                || movement.getIssueNumbers().stream().anyMatch(issueNo -> issueNo == null || issueNo.trim().isEmpty()))) {
            return ResponseEntity.badRequest().body("{\"status\": false, \"message\": \"Issue No is required for every new stock serial\"}");
        }

        boolean isRecorded = movementRepository.recordMovement(movement);

        if (isRecorded) {
            return ResponseEntity.ok("{\"status\": true, \"message\": \"Movement Recorded Successfully\"}");
        } else {
            return ResponseEntity.status(500).body("{\"status\": false, \"message\": \"Failed to record movement\"}");
        }
    }

    // History requests are not cached because logs need to be real-time
    @GetMapping("/tool/{id}")
    public ResponseEntity<java.util.List<ToolMovement>> getToolHistory(@PathVariable Integer id) {
        return ResponseEntity.ok(movementRepository.getMovementsByToolId(id));
    }

    // 🚀 EVICT "tools": Deleting a log might reverse an inventory count, wipe the tools cache!
    @CacheEvict(value = "tools", allEntries = true)
    @DeleteMapping("/{movementId}")
    public org.springframework.http.ResponseEntity<?> deleteMovement(@PathVariable Integer movementId) {
        boolean deleted = movementRepository.deleteMovement(movementId);
        if (deleted) return org.springframework.http.ResponseEntity.ok(java.util.Map.of("status", true));
        return org.springframework.http.ResponseEntity.status(500).body(java.util.Map.of("status", false));
    }

    // 🚀 EVICT "tools": Wiping history resets inventory, wipe the tools cache!
    @CacheEvict(value = "tools", allEntries = true)
    @DeleteMapping("/tool/{toolId}/clear")
    public org.springframework.http.ResponseEntity<?> clearToolHistory(@PathVariable Integer toolId) {
        boolean cleared = movementRepository.clearToolHistory(toolId);
        if (cleared) return org.springframework.http.ResponseEntity.ok(java.util.Map.of("status", true));
        return org.springframework.http.ResponseEntity.status(500).body(java.util.Map.of("status", false));
    }
}
