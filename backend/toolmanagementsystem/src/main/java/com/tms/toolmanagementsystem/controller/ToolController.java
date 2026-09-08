package com.tms.toolmanagementsystem.controller;

import com.tms.toolmanagementsystem.entity.Tool;
import com.tms.toolmanagementsystem.repository.ToolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tools")
@CrossOrigin(origins = "${cors.allowed-origins}")
public class ToolController {

    @Autowired
    private ToolRepository toolRepository;

    // 🚀 CACHE: Speeds up the Dashboard's background sync massively
    @GetMapping
    public ResponseEntity<List<Tool>> getAllTools(
            @RequestParam(required = false) Integer projectId,
            jakarta.servlet.http.HttpServletRequest request) {
        List<Tool> tools = toolRepository.findAllTools(
                projectId,
                getScopeId(request, "plantId"),
                getScopeId(request, "deptId"));
        return ResponseEntity.ok(tools);
    }

    // 🚀 EVICT: Wipe the "tools" cache because we have a new tool!
    @CacheEvict(value = "tools", allEntries = true)
    @PostMapping
    public ResponseEntity<?> addTool(@RequestBody Tool tool) {
        boolean isSaved = toolRepository.saveTool(tool);

        if (isSaved) {
            return ResponseEntity.ok("{\"status\": true, \"message\": \"Tool Added Successfully\"}");
        } else {
            return ResponseEntity.status(500).body("{\"status\": false, \"message\": \"Failed to add tool\"}");
        }
    }

    // 🚀 EVICT: Wipe the "tools" cache because a tool was deleted!
    @CacheEvict(value = "tools", allEntries = true)
    @DeleteMapping("/{toolId}")
    public ResponseEntity<?> deleteTool(@PathVariable Integer toolId) {
        boolean isDeleted = toolRepository.deleteTool(toolId);

        if (isDeleted) {
            return ResponseEntity.ok().body("{\"status\": true, \"message\": \"Tool and all associated data deleted successfully\"}");
        } else {
            return ResponseEntity.badRequest().body("{\"status\": false, \"message\": \"Failed to delete tool\"}");
        }
    }

    // Do NOT cache the individual getToolById because Edit pages need real-time data
    @GetMapping("/{id}")
    public ResponseEntity<Tool> getToolById(
            @PathVariable Integer id,
            jakarta.servlet.http.HttpServletRequest request) {
        Tool tool = toolRepository.getToolById(
                id,
                getScopeId(request, "plantId"),
                getScopeId(request, "deptId"));
        if (tool != null) {
            return ResponseEntity.ok(tool);
        }
        return ResponseEntity.notFound().build();
    }

    private Integer getScopeId(jakarta.servlet.http.HttpServletRequest request, String attribute) {
        if ("OWNER".equals(request.getAttribute("userRole"))) return null;
        Object value = request.getAttribute(attribute);
        if (value == null || "null".equals(value)) return null;
        return Integer.valueOf(value.toString());
    }

    // 🚀 EVICT: Wipe the "tools" cache because a tool's details were changed!
    @CacheEvict(value = "tools", allEntries = true)
    @PutMapping("/{id}")
    public ResponseEntity<java.util.Map<String, Object>> updateTool(
            @PathVariable Integer id,
            @RequestBody Tool tool,
            jakarta.servlet.http.HttpServletRequest request) {
        tool.setToolId(id);
        tool.setChangedBy((String) request.getAttribute("username"));
        boolean success = toolRepository.updateTool(tool);

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("status", success);
        response.put("message", success ? "Tool updated successfully!" : "Failed to update tool.");

        return ResponseEntity.ok(response);
    }
}
