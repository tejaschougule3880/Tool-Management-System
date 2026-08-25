package com.tms.toolmanagementsystem.entity;

public class ToolInstance {
    private Integer instanceId;
    private Integer toolId;
    private String serialNumber;
    private String issueNo;
    private String currentStatus;

    // Getters and Setters
    public Integer getInstanceId() { return instanceId; }
    public void setInstanceId(Integer instanceId) { this.instanceId = instanceId; }
    public Integer getToolId() { return toolId; }
    public void setToolId(Integer toolId) { this.toolId = toolId; }
    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }
    public String getIssueNo() { return issueNo; }
    public void setIssueNo(String issueNo) { this.issueNo = issueNo; }
    public String getCurrentStatus() { return currentStatus; }
    public void setCurrentStatus(String currentStatus) { this.currentStatus = currentStatus; }
}