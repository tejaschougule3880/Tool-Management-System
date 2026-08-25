package com.tms.toolmanagementsystem.entity;

public class ToolMovement {
    private Integer movementId;
    private Integer toolId;
    private Integer machineId; // Nullable
    private Integer projectId; // Nullable
    private Integer quantity;
    private String movementType; // STOCK_IN, ISSUE, RETURN, SHARPEN_OUT, SHARPEN_IN, SCRAP
    private String movementDate; // We can let MySQL auto-generate this, or pass it as string
    private String challanNo;
    private String remarks;
    // Add this near your other variables at the top
    private java.util.List<String> serials;
    private java.util.List<String> issueNumbers;
    // Add these variables near the top
    private String machineName;
    private String projectName;

    // Add these getters and setters at the bottom
    public String getMachineName() { return machineName; }
    public void setMachineName(String machineName) { this.machineName = machineName; }

    public String getProjectName() { return projectName; }
    public void setProjectName(String projectName) { this.projectName = projectName; }

    // Add these Getter and Setter methods at the bottom of the file
    public java.util.List<String> getSerials() {
        return serials;
    }

    public void setSerials(java.util.List<String> serials) {
        this.serials = serials;
    }

    public java.util.List<String> getIssueNumbers() { return issueNumbers; }
    public void setIssueNumbers(java.util.List<String> issueNumbers) { this.issueNumbers = issueNumbers; }
    // This holds the exact string from the database (e.g. "EM10-001, EM10-002")
    private String involvedSerials;
    private String involvedIssueNumbers;

    // Getters and Setters
    public String getInvolvedSerials() { return involvedSerials; }
    public void setInvolvedSerials(String involvedSerials) { this.involvedSerials = involvedSerials; }
    public String getInvolvedIssueNumbers() { return involvedIssueNumbers; }
    public void setInvolvedIssueNumbers(String involvedIssueNumbers) { this.involvedIssueNumbers = involvedIssueNumbers; }
    // Getters and Setters
    public Integer getMovementId() { return movementId; }
    public void setMovementId(Integer movementId) { this.movementId = movementId; }

    public Integer getToolId() { return toolId; }
    public void setToolId(Integer toolId) { this.toolId = toolId; }

    public Integer getMachineId() { return machineId; }
    public void setMachineId(Integer machineId) { this.machineId = machineId; }

    public Integer getProjectId() { return projectId; }
    public void setProjectId(Integer projectId) { this.projectId = projectId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getMovementType() { return movementType; }
    public void setMovementType(String movementType) { this.movementType = movementType; }

    public String getMovementDate() { return movementDate; }
    public void setMovementDate(String movementDate) { this.movementDate = movementDate; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getChallanNo() { return challanNo; }
    public void setChallanNo(String challanNo) { this.challanNo = challanNo; }
}