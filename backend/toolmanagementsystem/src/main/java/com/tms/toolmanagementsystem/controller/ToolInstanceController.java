package com.tms.toolmanagementsystem.controller;

import com.tms.toolmanagementsystem.entity.ToolInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "${cors.allowed-origins}")
public class ToolInstanceController {

    // 🚀 FIXED: We use JdbcTemplate now instead of manual DriverManager strings!
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/tool-instances/{toolId}/status/{status}")
    public ResponseEntity<List<ToolInstance>> getInstancesByStatus(
            @PathVariable Integer toolId,
            @PathVariable String status) {

        String sql = "SELECT * FROM tool_instance WHERE tool_id = ? AND current_status = ?";

        // 🚀 Executes your exact SQL query, but safely through the Railway connection pool
        List<ToolInstance> instances = jdbcTemplate.query(sql, (rs, rowNum) -> {
            ToolInstance ti = new ToolInstance();
            ti.setInstanceId(rs.getInt("instance_id"));
            ti.setToolId(rs.getInt("tool_id"));
            ti.setSerialNumber(rs.getString("serial_number"));
            ti.setIssueNo(rs.getString("issue_no"));
            ti.setCurrentStatus(rs.getString("current_status"));
            return ti;
        }, toolId, status);

        return ResponseEntity.ok(instances);
    }

    @GetMapping("/tool-instances/{toolId}")
    public ResponseEntity<List<ToolInstance>> getInstances(@PathVariable Integer toolId) {
        String sql = "SELECT * FROM tool_instance WHERE tool_id = ? ORDER BY serial_number";
        List<ToolInstance> instances = jdbcTemplate.query(sql, (rs, rowNum) -> {
            ToolInstance ti = new ToolInstance();
            ti.setInstanceId(rs.getInt("instance_id"));
            ti.setToolId(rs.getInt("tool_id"));
            ti.setSerialNumber(rs.getString("serial_number"));
            ti.setIssueNo(rs.getString("issue_no"));
            ti.setCurrentStatus(rs.getString("current_status"));
            return ti;
        }, toolId);
        return ResponseEntity.ok(instances);
    }

    @Transactional
    @DeleteMapping("/tool-instances/{instanceId}")
    public ResponseEntity<java.util.Map<String, Object>> deleteInstance(@PathVariable Integer instanceId) {
        List<Integer> toolIds = jdbcTemplate.query(
                "SELECT tool_id FROM tool_instance WHERE instance_id = ?",
                (rs, rowNum) -> rs.getInt("tool_id"), instanceId);
        int deleted = jdbcTemplate.update("DELETE FROM tool_instance WHERE instance_id = ?", instanceId);
        if (deleted > 0 && !toolIds.isEmpty()) {
            jdbcTemplate.update(
                    "UPDATE tool SET total_quantity = GREATEST(total_quantity - 1, 0) WHERE tool_id = ?",
                    toolIds.get(0));
        }
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("status", deleted > 0);
        response.put("message", deleted > 0 ? "Physical tool deleted successfully" : "Physical tool not found");
        return deleted > 0 ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @Transactional
    @DeleteMapping("/tool-instances/bulk")
    public ResponseEntity<java.util.Map<String, Object>> deleteInstances(@RequestBody List<Integer> instanceIds) {
        if (instanceIds == null || instanceIds.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        int deletedCount = 0;
        for (Integer instanceId : instanceIds) {
            List<Integer> toolIds = jdbcTemplate.query(
                    "SELECT tool_id FROM tool_instance WHERE instance_id = ?",
                    (rs, rowNum) -> rs.getInt("tool_id"), instanceId);
            int deleted = jdbcTemplate.update("DELETE FROM tool_instance WHERE instance_id = ?", instanceId);
            if (deleted > 0 && !toolIds.isEmpty()) {
                jdbcTemplate.update(
                        "UPDATE tool SET total_quantity = GREATEST(total_quantity - 1, 0) WHERE tool_id = ?",
                        toolIds.get(0));
                deletedCount++;
            }
        }

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("status", true);
        response.put("deletedCount", deletedCount);
        response.put("message", deletedCount + " physical tool(s) deleted successfully");
        return ResponseEntity.ok(response);
    }
}
