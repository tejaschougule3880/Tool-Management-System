package com.tms.toolmanagementsystem.repository;

import com.tms.toolmanagementsystem.entity.ToolMovement;
import com.tms.toolmanagementsystem.util.DBConnection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Types;

@Repository
public class MovementRepository {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Transactional
    public boolean recordMovement(ToolMovement movement) {
        DBConnection.ensureToolInstanceSerialIndex();

        Connection con = null;
        try {
            con = DBConnection.getConnection();
            // 🚀 Start Transaction
            con.setAutoCommit(false);

            // Convert the list of serials into a comma-separated string
            String joinedSerials = null;
            if (movement.getSerials() != null && !movement.getSerials().isEmpty()) {
                joinedSerials = String.join(", ", movement.getSerials());
            }

            // 🚀 STEP 1: Record the movement in tool_movement table
            String sqlMove = "INSERT INTO tool_movement (tool_id, machine_id, project_id, quantity, involved_serials, movement_type, challan_no, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            
            Object[] moveParams = new Object[8];
            int[] moveTypes = new int[8];
            moveParams[0] = movement.getToolId();
            moveParams[1] = movement.getMachineId();
            moveParams[2] = movement.getProjectId();
            moveParams[3] = movement.getQuantity();
            moveParams[4] = joinedSerials;
            moveParams[5] = movement.getMovementType();
            moveParams[6] = movement.getChallanNo() == null ? "" : movement.getChallanNo().trim();
            moveParams[7] = movement.getRemarks();
            
            moveTypes[0] = Types.INTEGER;
            moveTypes[1] = Types.INTEGER;
            moveTypes[2] = Types.INTEGER;
            moveTypes[3] = Types.INTEGER;
            moveTypes[4] = Types.VARCHAR;
            moveTypes[5] = Types.VARCHAR;
            moveTypes[6] = Types.VARCHAR;
            moveTypes[7] = Types.VARCHAR;
            
            jdbcTemplate.update(sqlMove, moveParams, moveTypes);

            // 🚀 STEP 2: Create or Update the Physical Serial Numbers!
            if (movement.getSerials() != null && !movement.getSerials().isEmpty()) {

                if ("STOCK_IN".equals(movement.getMovementType())) {
                    // 🚀 Insert new tool instances with UPSERT for reused serials
                        String sqlInsert = "INSERT INTO tool_instance (tool_id, serial_number, issue_no, current_status) VALUES (?, ?, ?, 'AVAILABLE') " +
                            "ON DUPLICATE KEY UPDATE current_status = 'AVAILABLE', issue_no = VALUES(issue_no), tool_id = VALUES(tool_id)";
                    
                        for (int index = 0; index < movement.getSerials().size(); index++) {
                        jdbcTemplate.update(sqlInsert, movement.getToolId(), movement.getSerials().get(index),
                            movement.getIssueNumbers().get(index).trim());
                    }
                } else {
                    // 🚀 Update existing serials based on movement type
                    String newStatus = "AVAILABLE"; // Default for RETURN and SHARPEN_IN
                    if ("ISSUE".equals(movement.getMovementType())) newStatus = "IN_USE";
                    if ("SHARPEN_OUT".equals(movement.getMovementType())) newStatus = "SHARPENING";
                    if ("SCRAP".equals(movement.getMovementType())) newStatus = "DAMAGED";

                    String sqlUpdate = "UPDATE tool_instance SET current_status = ?, current_machine_id = ?, current_project_id = ? WHERE serial_number = ? AND tool_id = ?";
                    
                    for (String serial : movement.getSerials()) {
                        Integer machineId = null;
                        Integer projectId = null;
                        
                        // Attach machine/project only if issuing
                        if ("ISSUE".equals(movement.getMovementType())) {
                            machineId = movement.getMachineId();
                            projectId = movement.getProjectId();
                        }
                        
                        jdbcTemplate.update(sqlUpdate, newStatus, machineId, projectId, serial, movement.getToolId());
                    }
                }
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    // getMovementsByToolId - FIXED to use JdbcTemplate
    public java.util.List<ToolMovement> getMovementsByToolId(Integer toolId) {
        String sql = "SELECT tm.*, m.machine_name, p.project_name " +
                "FROM tool_movement tm " +
                "LEFT JOIN machine m ON tm.machine_id = m.machine_id " +
                "LEFT JOIN project p ON tm.project_id = p.project_id " +
                "WHERE tm.tool_id = ? " +
                "ORDER BY tm.movement_date DESC";

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            ToolMovement m = new ToolMovement();
            m.setMovementId(rs.getInt("movement_id"));
            m.setToolId(rs.getInt("tool_id"));
            m.setMachineId((Integer) rs.getObject("machine_id"));
            m.setProjectId((Integer) rs.getObject("project_id"));
            m.setQuantity(rs.getInt("quantity"));
            m.setInvolvedSerials(rs.getString("involved_serials"));
            m.setMovementType(rs.getString("movement_type"));
            m.setChallanNo(rs.getString("challan_no"));
            m.setMovementDate(rs.getString("movement_date"));
            m.setRemarks(rs.getString("remarks"));
            m.setMachineName(rs.getString("machine_name"));
            m.setProjectName(rs.getString("project_name"));
            return m;
        }, toolId);
    }

    // 🚀 FIXED: Delete a single history record
    public boolean deleteMovement(Integer movementId) {
        String sql = "DELETE FROM tool_movement WHERE movement_id = ?";
        try {
            return jdbcTemplate.update(sql, movementId) > 0;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    // 🚀 FIXED: Delete ALL history for a specific tool
    public boolean clearToolHistory(Integer toolId) {
        String sql = "DELETE FROM tool_movement WHERE tool_id = ?";
        try {
            return jdbcTemplate.update(sql, toolId) >= 0;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}