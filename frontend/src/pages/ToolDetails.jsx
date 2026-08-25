import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';

export default function ToolDetails() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const userRole = localStorage.getItem('userRole');
  const activeDeptId = localStorage.getItem('activeDeptId');
  const isInventory = userRole === 'INVENTORY';
  
  // 🚀 SECURITY FIX: Validate assigned IDs for non-OWNER users
  const assignedPlantId = localStorage.getItem('assignedPlantId');
  const assignedDeptId = localStorage.getItem('assignedDeptId');

  const [movement, setMovement] = useState({
    toolId: id,
    movementType: 'ISSUE', 
    quantity: 1, 
    machineId: '',
    projectId: '',
    challanNo: '',
    remarks: ''
  });

  const [availableSerials, setAvailableSerials] = useState([]);
  const [selectedSerials, setSelectedSerials] = useState([]); 
  const [stockInSerials, setStockInSerials] = useState(['']); 
  const [stockInIssueNumbers, setStockInIssueNumbers] = useState(['']);
  const [serialSearch, setSerialSearch] = useState('');
  
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState(null);
  const [tool, setTool] = useState(null);
  const [toolLoading, setToolLoading] = useState(true);
  
  const [machines, setMachines] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [showHistory, setShowHistory] = useState(!isInventory);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
  const [toolInstances, setToolInstances] = useState([]);
  const [instanceSearch, setInstanceSearch] = useState('');
  const [instanceStatusFilter, setInstanceStatusFilter] = useState('ALL');
  const [selectedInstanceIds, setSelectedInstanceIds] = useState([]);
  const [showInstanceManager, setShowInstanceManager] = useState(false);
  const [instancesLoading, setInstancesLoading] = useState(false);

  const handleDeleteHistoryRow = async (movementId) => {
    if (window.confirm("Are you sure you want to delete this log record?")) {
      try {
        await axios.delete(`${API_URL}/api/movements/${movementId}`);
        setHistory(history.filter(h => h.movementId !== movementId)); 
        setSelectedHistoryIds(selectedHistoryIds.filter(id => id !== movementId));
      } catch (error) {
        alert("Failed to delete record.");
      }
    }
  };

  const handleClearAllHistory = async () => {
    if (window.confirm("🚨 WARNING: Are you sure you want to wipe ALL history for this tool?")) {
      try {
        await axios.delete(`${API_URL}/api/movements/tool/${id}/clear`);
        setHistory([]); 
        setSelectedHistoryIds([]);
      } catch (error) {
        alert("Failed to clear history.");
      }
    }
  };

  const handleSelectOne = (movementId) => {
    if (selectedHistoryIds.includes(movementId)) {
      setSelectedHistoryIds(selectedHistoryIds.filter(selectedId => selectedId !== movementId));
    } else {
      setSelectedHistoryIds([...selectedHistoryIds, movementId]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedHistoryIds(displayHistory.map(r => r.movementId));
    } else {
      setSelectedHistoryIds([]);
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedHistoryIds.length} selected records?`)) {
      try {
        await Promise.all(selectedHistoryIds.map(movementId => 
          axios.delete(`${API_URL}/api/movements/${movementId}`)
        ));
        setHistory(history.filter(h => !selectedHistoryIds.includes(h.movementId)));
        setSelectedHistoryIds([]); 
      } catch (error) {
        alert("Error deleting some records. Please refresh and check the ledger.");
      }
    }
  };

  const displayHistory = history.filter(record => 
    historySearch === '' || 
    (record.involvedSerials && record.involvedSerials.toLowerCase().includes(historySearch.toLowerCase())) ||
    (record.movementType && record.movementType.toLowerCase().includes(historySearch.toLowerCase()))
  );

  useEffect(() => {
    // 🚀 SECURITY FIX: Block unassigned non-OWNER users from accessing tool details
    if (userRole && userRole !== 'OWNER') {
      if (!assignedPlantId || assignedPlantId === 'null' || !assignedDeptId || assignedDeptId === 'null') {
        console.warn("SECURITY: User blocked - no assigned plant/dept for tool access");
        navigate('/plant-selection');
        return;
      }
    }
    
    const fetchMasterData = async () => {
      // 🚀 CACHE: Load Static Machines and Projects from memory if possible
      const cachedMachines = sessionStorage.getItem('master_machines');
      const cachedProjects = sessionStorage.getItem(`projects_dept_${activeDeptId}`);

      if (cachedMachines) {
        setMachines(JSON.parse(cachedMachines));
      } else {
        try {
          const machineRes = await axios.get(`${API_URL}/api/machines`);
          setMachines(machineRes.data);
          sessionStorage.setItem('master_machines', JSON.stringify(machineRes.data));
        } catch (error) { console.error("Failed to load machines"); }
      }

      if (cachedProjects) {
        setProjects(JSON.parse(cachedProjects));
      } else {
        try {
          const projectUrl = activeDeptId ? `${API_URL}/api/projects/${activeDeptId}` : `${API_URL}/api/projects`;
          const projectRes = await axios.get(projectUrl);
          setProjects(projectRes.data);
          sessionStorage.setItem(`projects_dept_${activeDeptId}`, JSON.stringify(projectRes.data));
        } catch (error) { console.error("Failed to load projects"); }
      }

      // 🚀 REAL-TIME: Always fetch Movement History fresh
      try {
        const historyRes = await axios.get(`${API_URL}/api/movements/tool/${id}`);
        setHistory(historyRes.data);
      } catch (error) { console.error("Failed to load history"); }

      try {
        const toolRes = await axios.get(`${API_URL}/api/tools/${id}`);
        setTool(toolRes.data);
      } catch (error) {
        console.error("Failed to load tool details", error);
      } finally {
        setToolLoading(false);
      }

    };
    
    fetchMasterData();
  }, [id, activeDeptId]);

  useEffect(() => {
    if (!isInventory) return;

    let targetStatus = '';
    if (movement.movementType === 'ISSUE') targetStatus = 'AVAILABLE';
    else if (movement.movementType === 'RETURN') targetStatus = 'IN_USE';
    else if (movement.movementType === 'SHARPEN_OUT') targetStatus = 'AVAILABLE';
    else if (movement.movementType === 'SHARPEN_IN') targetStatus = 'SHARPENING';
    else if (movement.movementType === 'SCRAP') targetStatus = 'AVAILABLE'; 

    if (targetStatus && id && movement.movementType !== 'STOCK_IN') {
      axios.get(`${API_URL}/api/tool-instances/${id}/status/${targetStatus}`)
        .then(res => {
          setAvailableSerials(res.data);
          setSelectedSerials([]); 
        })
        .catch(err => console.error("Error fetching serials", err));
    } else {
      setAvailableSerials([]);
      setSelectedSerials([]);
    }
  }, [movement.movementType, id, isInventory]);

  const handleStockInQuantityChange = (e) => {
    let newQty = parseInt(e.target.value);
    if (isNaN(newQty) || newQty < 1) newQty = 1;
    const newSerials = [...stockInSerials];
    const newIssueNumbers = [...stockInIssueNumbers];
    while (newSerials.length < newQty) newSerials.push('');
    while (newIssueNumbers.length < newQty) newIssueNumbers.push('');
    if (newSerials.length > newQty) newSerials.length = newQty;
    if (newIssueNumbers.length > newQty) newIssueNumbers.length = newQty;
    setStockInSerials(newSerials);
    setStockInIssueNumbers(newIssueNumbers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const activeSerials = movement.movementType === 'STOCK_IN' ? stockInSerials : selectedSerials;

    if (activeSerials.length === 0 || activeSerials.some(s => s.trim() === '')) {
      alert("Please select or fill out all specific tool serial numbers!");
      return;
    }

    if (movement.movementType === 'STOCK_IN' && stockInIssueNumbers.some(issueNo => !issueNo.trim())) {
      alert('Issue No is required for every new stock serial.');
      return;
    }

    if (movement.movementType === 'SHARPEN_OUT' && !movement.challanNo.trim()) {
      alert('Challan No is required when sending tools to sharpening.');
      return;
    }

    try {
      const payload = {
        ...movement,
        machineId: movement.machineId ? parseInt(movement.machineId) : null,
        projectId: movement.projectId ? parseInt(movement.projectId) : null,
        quantity: activeSerials.length,
        serials: activeSerials,
        issueNumbers: movement.movementType === 'STOCK_IN' ? stockInIssueNumbers : []
      };

      const response = await axios.post(`${API_URL}/api/movements`, payload);
      
      if (response.data.status === true) {
        setMessage({ type: 'success', text: response.data.message });
        
        setSelectedSerials([]);
        setStockInSerials(['']);
        setStockInIssueNumbers(['']);
        setSerialSearch(''); 
        setMovement({ ...movement, remarks: '', challanNo: '', machineId: '', projectId: '' });
        
        // 🚀 CACHE INVALIDATION: Wipe Dashboard cache so it fetches fresh numbers next time
        sessionStorage.removeItem('dashboard_tools');

        setTimeout(() => setMessage(null), 3000);
        setTimeout(() => window.location.reload(), 1500); 
      }
    } catch (error) {
      setMessage({ type: 'danger', text: 'Failed to record movement.' });
    }
  };

  const handleDeleteInstance = async (instance) => {
    if (!window.confirm(`Delete physical tool with serial ${instance.serialNumber}? Movement history will be kept.`)) return;

    try {
      await axios.delete(`${API_URL}/api/tool-instances/${instance.instanceId}`);
      setToolInstances((currentInstances) => currentInstances.filter(
        currentInstance => currentInstance.instanceId !== instance.instanceId
      ));
      setSelectedInstanceIds((currentIds) => currentIds.filter(id => id !== instance.instanceId));
      sessionStorage.removeItem('dashboard_tools');
      setMessage({ type: 'success', text: `Serial ${instance.serialNumber} deleted successfully.` });
    } catch (error) {
      setMessage({ type: 'danger', text: 'Failed to delete physical tool.' });
    }
  };

  const handleToggleInstanceManager = async () => {
    if (showInstanceManager) {
      setShowInstanceManager(false);
      return;
    }

    setShowInstanceManager(true);
    setInstancesLoading(true);
    try {
      const instancesRes = await axios.get(`${API_URL}/api/tool-instances/${id}`);
      setToolInstances(instancesRes.data);
    } catch (error) {
      setMessage({ type: 'danger', text: 'Failed to load physical tools.' });
    } finally {
      setInstancesLoading(false);
    }
  };

  const filteredInstances = toolInstances.filter(instance => {
    const matchesSearch = `${instance.serialNumber} ${instance.currentStatus}`
      .toLowerCase().includes(instanceSearch.toLowerCase());
    const matchesStatus = instanceStatusFilter === 'ALL' || instance.currentStatus === instanceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSelectAllInstances = (e) => {
    setSelectedInstanceIds(e.target.checked
      ? filteredInstances.map(instance => instance.instanceId)
      : []);
  };

  const handleDeleteSelectedInstances = async () => {
    if (!selectedInstanceIds.length || !window.confirm(`Delete ${selectedInstanceIds.length} selected physical tool(s)? Movement and change history will be kept.`)) return;

    try {
      await axios.delete(`${API_URL}/api/tool-instances/bulk`, { data: selectedInstanceIds });
      setToolInstances((currentInstances) => currentInstances.filter(
        instance => !selectedInstanceIds.includes(instance.instanceId)
      ));
      setSelectedInstanceIds([]);
      sessionStorage.removeItem('dashboard_tools');
      setMessage({ type: 'success', text: 'Selected physical tools deleted successfully.' });
    } catch (error) {
      setMessage({ type: 'danger', text: 'Failed to delete selected physical tools.' });
    }
  };

  return (
    <div className="container mt-5 mb-5">
      <button className="btn btn-outline-secondary mb-4 shadow-sm" onClick={() => navigate('/dashboard')}>
        ← Back to Dashboard
      </button>

      {toolLoading ? (
        <div className="card panel-card border-0 mx-auto mb-4" style={{ maxWidth: '900px' }}>
          <div className="card-body p-5 text-center">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-3 mb-0 text-muted">Loading tool details…</p>
          </div>
        </div>
      ) : (
        <div className="card panel-card border-0 mx-auto mb-4" style={{ maxWidth: '900px' }}>
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3">
            <div>
              <h2 className="fw-bold text-gradient-primary mb-2">{tool?.toolName || `Tool #${id}`}</h2>
              <p className="text-muted mb-1">Code: <span className="fw-semibold text-dark">{tool?.toolCode || 'N/A'}</span></p>
              <p className="text-muted mb-0">Location: <span className="fw-semibold text-dark">{tool?.storageLocation || 'N/A'}</span></p>
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className={`badge ${tool?.status === 'AVAILABLE' ? 'bg-success' : tool?.status === 'UNAVAILABLE' ? 'bg-danger' : 'bg-warning'} text-uppercase`}>
                {tool?.status || 'LOADING'}
              </span>
              <span className="badge bg-light text-dark">Spec: {tool?.specNumber || '-'}</span>
              <span className="badge bg-light text-dark">Drawing: {tool?.drawingNumber || '-'}</span>
            </div>
          </div>

          <div className="row row-cols-1 row-cols-md-3 g-3 mt-4">
            <div className="col">
              <div className="border rounded-3 p-3 bg-light h-100">
                <p className="text-muted mb-1">Available Stock</p>
                <h5 className="fw-bold mb-0">{tool?.availableQuantity ?? '-'}</h5>
              </div>
            </div>
            <div className="col">
              <div className="border rounded-3 p-3 bg-light h-100">
                <p className="text-muted mb-1">Minimum Qty</p>
                <h5 className="fw-bold mb-0">{tool?.minimumQuantity ?? '-'}</h5>
              </div>
            </div>
            <div className="col">
              <div className="border rounded-3 p-3 bg-light h-100">
                <p className="text-muted mb-1">Tool Type</p>
                <h5 className="fw-bold mb-0">{tool?.toolName ? 'Inventory Item' : '-'}</h5>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {isInventory && (
        <div className="card shadow-sm border-0 mx-auto" style={{ maxWidth: '600px' }}>
          <div className="card-header bg-white py-3">
            <h4 className="mb-0 fw-bold text-primary">Record Inventory Movement</h4>
            <span className="text-muted small">Tool ID: {id}</span>
          </div>
          
          <div className="card-body p-4">
            {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label fw-bold text-dark">Transaction Type</label>
                <select 
                  className="form-select form-select-lg bg-light border-0 fw-semibold text-primary" 
                  value={movement.movementType}
                  onChange={(e) => setMovement({...movement, movementType: e.target.value})}
                >
                  <option value="ISSUE">Issue Tool (Decrease Stock)</option>
                  <option value="RETURN">Return Tool (Increase Stock)</option>
                  <option value="STOCK_IN">New Stock In (Increase Stock)</option>
                  <option value="SHARPEN_OUT">Send to Sharpening (Decrease Stock)</option>
                  <option value="SHARPEN_IN">Receive from Sharpening (Increase Stock)</option>
                  <option value="SCRAP">Scrap / Dispose (Decrease Stock)</option>
                </select>
              </div>

              {movement.movementType === 'STOCK_IN' ? (
                <div className="mb-4 p-3 border rounded bg-light">
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-primary">Quantity of New Stock</label>
                    <input type="number" className="form-control border-primary" required min="1"
                      value={stockInSerials.length} 
                      onChange={handleStockInQuantityChange} 
                    />
                  </div>
                  <label className="form-label fw-bold mb-2">Scan or Type New Serial Numbers</label>
                  <div className="row g-2">
                    {stockInSerials.map((serial, index) => (
                      <div key={index} className="col-md-6">
                        <div className="input-group input-group-sm mb-1">
                          <span className="input-group-text bg-white text-muted fw-bold">#{index + 1}</span>
                          <input 
                            id={`stock-in-${index}`}
                            type="text" 
                            className="form-control border-start-0" 
                            placeholder="Enter OEM Serial..."
                            required
                            value={serial}
                            onChange={(e) => {
                              const updated = [...stockInSerials];
                              updated[index] = e.target.value;
                              setStockInSerials(updated);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault(); 
                                const nextInput = document.getElementById(`stock-in-${index + 1}`);
                                if (nextInput) nextInput.focus();
                              }
                            }}
                          />
                        </div>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Issue No (e.g., ISS-2026-A)"
                          aria-label={`Issue number for serial ${index + 1}`}
                          required
                          value={stockInIssueNumbers[index]}
                          onChange={(e) => {
                            const updated = [...stockInIssueNumbers];
                            updated[index] = e.target.value;
                            setStockInIssueNumbers(updated);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label fw-bold mb-0">Select Specific Tools</label>
                    {availableSerials.length > 0 && (
                      <button 
                        type="button" 
                        className="btn btn-sm btn-link text-decoration-none py-0"
                        onClick={() => {
                          if (selectedSerials.length === availableSerials.length) {
                            setSelectedSerials([]); 
                          } else {
                            setSelectedSerials(availableSerials.map(s => s.serialNumber)); 
                          }
                        }}
                      >
                        {selectedSerials.length === availableSerials.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {availableSerials.length === 0 ? (
                    <div className="alert alert-warning py-2 small mb-0 fw-semibold">
                      No tools currently available for this action.
                    </div>
                  ) : (
                    <div className="border rounded p-2 bg-white shadow-sm">
                      <input 
                        type="text" 
                        className="form-control form-control-sm mb-3 bg-light border-0" 
                        placeholder="🔍 Search serial numbers..."
                        value={serialSearch}
                        onChange={(e) => setSerialSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault(); 
                        }}
                      />
                      
                      <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {availableSerials
                          .filter(instance => instance.serialNumber.toLowerCase().includes(serialSearch.toLowerCase()))
                          .map(instance => (
                          <div key={instance.instanceId} className="form-check mb-2">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              value={instance.serialNumber}
                              id={`serial-${instance.instanceId}`}
                              checked={selectedSerials.includes(instance.serialNumber)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSerials([...selectedSerials, instance.serialNumber]);
                                } else {
                                  setSelectedSerials(selectedSerials.filter(s => s !== instance.serialNumber));
                                }
                              }}
                            />
                            <label className="form-check-label fw-semibold text-primary" htmlFor={`serial-${instance.instanceId}`} style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>
                              {instance.serialNumber}
                            </label>
                          </div>
                        ))}
                        
                        {availableSerials.filter(instance => instance.serialNumber.toLowerCase().includes(serialSearch.toLowerCase())).length === 0 && (
                          <div className="text-muted small text-center py-2">
                            No serial numbers match "{serialSearch}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="form-text mt-2">
                    Total Selected: <span className="fw-bold text-dark fs-6">{selectedSerials.length}</span>
                  </div>
                </div>
              )}

              {movement.movementType === 'ISSUE' && (
                <div className="row mb-3">
                  <div className="col">
                    <label className="form-label fw-semibold">Machine (Optional)</label>
                    <select 
                      className="form-select bg-light"
                      value={movement.machineId}
                      onChange={(e) => setMovement({...movement, machineId: e.target.value})}
                    >
                      <option value="">-- Select Machine --</option>
                      {machines.map(m => (
                        <option key={m.machineId} value={m.machineId}>{m.machineName}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col">
                    <label className="form-label fw-semibold">Project (Optional)</label>
                    <select 
                      className="form-select bg-light"
                      value={movement.projectId}
                      onChange={(e) => setMovement({...movement, projectId: e.target.value})}
                    >
                      <option value="">-- Select Project --</option>
                      {projects.map(p => (
                        <option key={p.projectId} value={p.projectId}>{p.projectName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {movement.movementType === 'SHARPEN_OUT' && (
                <div className="mb-4">
                  <label className="form-label fw-semibold">Challan No <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control bg-light"
                    placeholder="Enter challan number"
                    value={movement.challanNo}
                    onChange={(e) => setMovement({ ...movement, challanNo: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="form-label fw-semibold">Remarks / Notes</label>
                <input type="text" className="form-control bg-light" placeholder="e.g., Broken edge, given to John"
                  value={movement.remarks} 
                  onChange={(e) => setMovement({...movement, remarks: e.target.value})} 
                />
              </div>

              <button type="submit" className="btn btn-primary w-100 fw-bold py-2 rounded-pill shadow-sm">
                Confirm Transaction
              </button>
            </form>
          </div>
        </div>
      )}

      {(userRole === 'INVENTORY' || userRole === 'OWNER') && !showInstanceManager && (
        <div className="text-center mt-4">
          <button type="button" className="btn btn-outline-primary fw-bold rounded-pill px-4" onClick={handleToggleInstanceManager}>
            Manage Serial Tools
          </button>
        </div>
      )}

      {(userRole === 'INVENTORY' || userRole === 'OWNER') && showInstanceManager && (
        <div className="card shadow-sm border-0 mx-auto mt-4" style={{ maxWidth: '900px' }}>
          <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center gap-3">
            <div>
              <h5 className="mb-1 fw-bold">Manage Physical Tools</h5>
              <span className="small text-white-50">Delete a serial without deleting movement or change history</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-secondary">{toolInstances.length} Serials</span>
              <button type="button" className="btn btn-sm btn-outline-light" onClick={handleToggleInstanceManager}>
                Hide
              </button>
            </div>
          </div>
          <div className="card-body">
            {instancesLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="text-muted mb-0 mt-2">Loading serials...</p>
              </div>
            ) : (<>
              <div className="row g-2 mb-3">
                <div className="col-md-8">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Find a serial number..."
                    value={instanceSearch}
                    onChange={(e) => setInstanceSearch(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <select
                    className="form-select"
                    value={instanceStatusFilter}
                    onChange={(e) => setInstanceStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All statuses</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="IN_USE">In use</option>
                    <option value="SHARPENING">Sharpening</option>
                    <option value="DAMAGED">Damaged</option>
                  </select>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <label className="form-check mb-0 fw-semibold text-secondary">
                  <input
                    type="checkbox"
                    className="form-check-input me-2"
                    checked={filteredInstances.length > 0 && selectedInstanceIds.length === filteredInstances.length}
                    onChange={handleSelectAllInstances}
                  />
                  Select visible ({filteredInstances.length})
                </label>
                <div className="d-flex gap-2 align-items-center">
                  {selectedInstanceIds.length > 0 && (
                    <>
                      <span className="small text-muted">{selectedInstanceIds.length} selected</span>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedInstanceIds([])}>
                        Clear selection
                      </button>
                      <button type="button" className="btn btn-sm btn-danger fw-bold" onClick={handleDeleteSelectedInstances}>
                        Delete selected
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Serial Number</th>
                    <th>Issue No</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstances.map(instance => (
                      <tr key={instance.instanceId}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedInstanceIds.includes(instance.instanceId)}
                            onChange={() => setSelectedInstanceIds((currentIds) => currentIds.includes(instance.instanceId)
                              ? currentIds.filter(id => id !== instance.instanceId)
                              : [...currentIds, instance.instanceId])}
                          />
                        </td>
                        <td className="font-monospace fw-semibold">{instance.serialNumber}</td>
                        <td className="fw-semibold text-secondary">{instance.issueNo || '-'}</td>
                        <td>
                          <span className={`badge ${instance.currentStatus === 'DAMAGED' ? 'bg-danger' : instance.currentStatus === 'AVAILABLE' ? 'bg-success' : 'bg-secondary'}`}>
                            {instance.currentStatus}
                          </span>
                        </td>
                        <td className="text-end">
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteInstance(instance)}>
                            Delete Serial
                          </button>
                        </td>
                      </tr>
                    ))}
                  {filteredInstances.length === 0 && (
                    <tr><td colSpan="5" className="text-center text-muted py-3">No physical tools found.</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </>)}
          </div>
        </div>
      )}
      
      <div className="text-center mt-5 mb-4 d-flex justify-content-center gap-3 flex-wrap">
        {isInventory && (
          <button className="btn btn-outline-secondary fw-bold rounded-pill px-4 shadow-sm" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? 'Hide Movement History ↑' : 'View Movement History ↓'}
          </button>
        )}
      </div>

      {showHistory && (
        <div className="card shadow-sm border-0 mx-auto mb-5" style={{ maxWidth: '900px' }}>
          
          <div className="card-header bg-dark text-white py-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <h5 className="mb-0 fw-bold">Movement History Ledger</h5>
              <span className="badge bg-secondary">{displayHistory.length} Records</span>
            </div>
            
            <div className="d-flex gap-2">
              <input 
                type="text" 
                className="form-control form-control-sm border-0" 
                placeholder="🔍 Search serials or type..." 
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{ width: '200px' }}
              />
              
              {isInventory && selectedHistoryIds.length > 0 && (
                <button className="btn btn-warning btn-sm fw-bold shadow-sm" onClick={handleBulkDelete}>
                  Delete Selected ({selectedHistoryIds.length})
                </button>
              )}
              {isInventory && history.length > 0 && (
                <button className="btn btn-danger btn-sm fw-bold shadow-sm" onClick={handleClearAllHistory}>
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  {isInventory && (
                    <th style={{ width: '40px', paddingLeft: '1rem' }}>
                      <input 
                        type="checkbox" 
                        className="form-check-input border-secondary"
                        checked={displayHistory.length > 0 && selectedHistoryIds.length === displayHistory.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                  )}
                  <th>Date</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Serials</th> 
                  <th>Machine</th>
                  <th>Project</th>
                  <th>Challan No</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {displayHistory.length === 0 ? (
                  <tr><td colSpan={isInventory ? "9" : "8"} className="text-center py-4 text-muted">No movements found.</td></tr>
                ) : (
                  displayHistory.map((record) => (
                    <tr key={record.movementId} className={selectedHistoryIds.includes(record.movementId) ? "table-active" : ""}>
                      
                      {isInventory && (
                        <td style={{ paddingLeft: '1rem' }}>
                          <input 
                            type="checkbox" 
                            className="form-check-input border-secondary"
                            style={{ cursor: 'pointer' }}
                            checked={selectedHistoryIds.includes(record.movementId)}
                            onChange={() => handleSelectOne(record.movementId)}
                          />
                        </td>
                      )}
                      
                      <td className="text-muted small">{new Date(record.movementDate).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${record.movementType === 'ISSUE' || record.movementType === 'SCRAP' || record.movementType === 'SHARPEN_OUT' ? 'bg-danger' : 'bg-success'}`}>
                          {record.movementType}
                        </span>
                      </td>
                      <td className="fw-bold">{record.quantity}</td>
                      <td className="small font-monospace text-primary fw-semibold" style={{ maxWidth: '150px' }}>
                        {record.involvedSerials || '-'}
                      </td>
                      <td className="fw-semibold text-dark small">{record.machineName || '-'}</td>
                      <td className="fw-semibold text-dark small">{record.projectName || '-'}</td>
                      <td className="fw-semibold text-dark small">{record.challanNo || '-'}</td>
                      <td className="small text-secondary">{record.remarks || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
