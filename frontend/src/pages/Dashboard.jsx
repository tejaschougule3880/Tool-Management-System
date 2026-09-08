import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import { canManageInventory, isOwner } from '../permissions';

export default function Dashboard() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole'); 
  const activeProjectId = localStorage.getItem('activeProjectId');
  const activeProjectName = localStorage.getItem('activeProjectName');
  
  // 🚀 SECURITY FIX: Validate assigned IDs for non-OWNER users
  const assignedPlantId = localStorage.getItem('assignedPlantId');
  const assignedDeptId = localStorage.getItem('assignedDeptId');

  const isInventory = canManageInventory(userRole);
  const canManage = isInventory;

  const [tools, setTools] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isSyncing, setIsSyncing] = useState(false); // 🚀 Tracks background refresh

  useEffect(() => {
    if (!userRole) { navigate('/login'); return; }
    
    // 🚀 SECURITY FIX: Block unassigned non-OWNER users from accessing dashboard
    if (!isOwner(userRole)) {
      if (!assignedPlantId || assignedPlantId === 'null' || !assignedDeptId || assignedDeptId === 'null') {
        console.warn("SECURITY: User blocked - no assigned plant/dept");
        navigate('/plant-selection');
        return;
      }
    }
    
    if (!activeProjectId) { navigate('/project-selection'); return; }
    
    const fetchTools = async () => {
      // 🚀 CACHE: Load instantly so the user doesn't wait
      const cachedTools = sessionStorage.getItem('dashboard_tools');
      if (cachedTools) {
        setTools(JSON.parse(cachedTools));
      }

      // 🚀 SILENT REFRESH: Always fetch real-time inventory in the background
      setIsSyncing(true);
      try {
        const response = await axios.get(`${API_URL}/api/tools`);
        setTools(response.data);
        sessionStorage.setItem('dashboard_tools', JSON.stringify(response.data));
      } catch (error) {
        console.error("Error fetching tools", error);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchTools();
  }, [userRole, activeProjectId, navigate]);

  const handleLogout = () => {
    localStorage.clear(); 
    navigate('/login');
  };

  const handleChangeProject = () => {
    localStorage.removeItem('activeProjectId');
    localStorage.removeItem('activeProjectName');
    navigate('/project-selection');
  };

  const handleDelete = async (toolId) => {
    if (window.confirm("Are you sure you want to delete this tool? This will also erase its serial numbers and movement history!")) {
      try {
        const response = await axios.delete(`${API_URL}/api/tools/${toolId}`);
        if (response.data.status === true) {
          const updatedTools = tools.filter(tool => tool.toolId !== toolId);
          setTools(updatedTools);
          sessionStorage.setItem('dashboard_tools', JSON.stringify(updatedTools)); // Sync cache
        }
      } catch (error) {
        alert("Error: Could not delete tool.");
      }
    }
  };

  const projectTools = tools.filter(tool => tool.projectId === parseInt(activeProjectId));

  const totalTools = projectTools.length;
  const totalAvailableStock = projectTools.reduce((sum, tool) => sum + Number(tool.availableQuantity || 0), 0);
  const lowStockItems = projectTools.filter(tool => Number(tool.availableQuantity || 0) < tool.minimumQuantity).length;
  const sharpeningItems = projectTools.reduce((sum, tool) => sum + Number(tool.sharpeningQuantity || 0), 0);
  const damagedItems = projectTools.reduce((sum, tool) => sum + Number(tool.damagedQuantity || 0), 0);
  const unavailableItems = projectTools.filter(tool => tool.status === 'UNAVAILABLE').length;

  const displayTools = projectTools.filter(tool => {
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch = (tool.toolCode || '').toString().toLowerCase().includes(lowerSearch) ||
                          (tool.toolName || '').toString().toLowerCase().includes(lowerSearch) ||
                          (tool.drawingNumber || '').toString().toLowerCase().includes(lowerSearch) ||
                          (tool.specNumber || '').toString().toLowerCase().includes(lowerSearch)||
                          (tool.storageLocation || '').toString().toLowerCase().includes(lowerSearch);
    
    if (!matchesSearch) return false;

    switch (activeFilter) {
      case 'AVAILABLE': return Number(tool.availableQuantity || 0) > 0;
      case 'LOW_STOCK': return Number(tool.availableQuantity || 0) < tool.minimumQuantity;
      case 'SHARPENING': return Number(tool.sharpeningQuantity || 0) > 0;
      case 'DAMAGED': return Number(tool.damagedQuantity || 0) > 0; 
      case 'UNAVAILABLE': return tool.status === 'UNAVAILABLE';
      case 'ALL':
      default: return true;
    }
  });

  return (
    <div className="dashboard-shell container-fluid bg-light min-vh-100 py-3 py-md-4">
      <div className="dashboard-header d-flex justify-content-between align-items-start mb-4 px-2 px-md-3">
        <div className="dashboard-header-text">
          <h2 className="fw-bold text-primary mb-0 d-flex align-items-center flex-wrap gap-2">
            {activeProjectName} {isInventory ? 'Inventory' : 'Catalog'}
            {isSyncing && <div className="spinner-grow spinner-grow-sm text-secondary" role="status" title="Syncing real-time data..."></div>}
          </h2>
          <span className="text-muted small">TMS Dashboard</span>
        </div>
        <div className="dashboard-header-actions d-flex align-items-center flex-wrap gap-2 gap-md-3">
          <span className={`fw-semibold border px-3 py-1 rounded-pill ${canManage ? 'text-secondary border-secondary' : 'text-info border-info'}`}>
            Role: {userRole || 'VIEWER'}
          </span>
          {userRole === 'OWNER' && (
            <>
              <button className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold" onClick={() => navigate('/owner-menu')}>
                ← Back to Menu
              </button>
              <button className="btn btn-outline-primary btn-sm rounded-pill px-3 fw-bold" onClick={() => navigate('/owner-users')}>
                Manage Users
              </button>
            </>
          )}
          <button className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-bold" onClick={handleChangeProject}>
            Change Project
          </button>
          <button className="btn btn-outline-danger btn-sm rounded-pill px-4 fw-bold" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="row g-3 px-2 px-md-3 mb-4">
        {[
          { title: 'Total Tool Types', value: totalTools, color: 'primary', filterKey: 'ALL' },
          { title: 'Total Available Stock', value: totalAvailableStock, color: 'success', filterKey: 'AVAILABLE' },
          { title: 'Low Stock Alerts', value: lowStockItems, color: 'danger', filterKey: 'LOW_STOCK' },
          { title: 'In Sharpening', value: sharpeningItems, color: 'warning', filterKey: 'SHARPENING' },
          { title: 'SCRAPED', value: damagedItems, color: 'secondary', filterKey: 'DAMAGED' },
          { title: 'Out of Stock', value: unavailableItems, color: 'dark', filterKey: 'UNAVAILABLE' }
        ].map((metric, index) => {
          const isActive = activeFilter === metric.filterKey;
          
          return (
            <div key={index} className="col-12 col-sm-6 col-lg-4 col-xl" onClick={() => setActiveFilter(metric.filterKey)}>
              <div 
                className={`dashboard-metric-card card border-0 shadow-sm border-start border-${metric.color} border-4 h-100`}
                style={{ 
                  cursor: 'pointer', 
                  transition: 'all 0.2s ease-in-out',
                  transform: isActive ? 'scale(1.01)' : 'scale(1)',
                  backgroundColor: isActive ? '#f8f9fa' : 'white',
                  boxShadow: isActive ? '0 0.5rem 1rem rgba(0,0,0,0.15)' : ''
                }}
              >
                <div className="card-body py-3">
                  <p className="text-muted fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>{metric.title.toUpperCase()}</p>
                  <h3 className={`fw-bold text-${metric.color} mb-0`}>{metric.value}</h3>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card shadow-sm border-0 mx-2 mx-md-3 rounded-3 overflow-hidden">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 border-bottom-0 dashboard-toolbar">
          <h5 className="mb-0 fw-bold text-dark dashboard-toolbar-title">
            {isInventory ? 'Tool Inventory' : 'Available Tools'}
            {activeFilter !== 'ALL' && (
               <span className="badge bg-secondary ms-3 align-middle" style={{fontSize: '0.75rem'}}>
                 Filtered: {activeFilter.replace('_', ' ')}
                 <button 
                   type="button" 
                   className="btn-close btn-close-white ms-2" 
                   style={{fontSize: '0.5rem'}}
                   onClick={(e) => { e.stopPropagation(); setActiveFilter('ALL'); }}
                 ></button>
               </span>
            )}
          </h5>
          <div className="dashboard-toolbar-actions d-flex gap-2 gap-md-3">
            <input 
              type="text" 
              className="form-control bg-light border-0" 
              placeholder="Search by code, name, drawing no., location or spec no..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {canManage && (
              <button 
                className="btn btn-primary fw-bold text-nowrap rounded-3 shadow-sm"
                onClick={() => navigate('/add-tool')} 
              >
                + Add Tool
              </button>
            )}
          </div>
        </div>

        <div className="dashboard-table-wrap table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light text-secondary" style={{ fontSize: '0.9rem' }}>
              <tr>
                <th className="ps-4">Code</th>
                <th>Tool Name</th>
                <th>Min Qty</th>
                <th>Available</th>
                <th>Location</th>
                <th>Drawing No.</th>
                <th>Spec No.</th>
                <th>Status</th>
                <th className="text-end pe-4">{isInventory ? 'Actions' : 'Details'}</th>
              </tr>
            </thead>
            <tbody>
              {displayTools.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    {isSyncing ? "Syncing inventory data..." : "No tools match the current filter or search."}
                  </td>
                </tr>
              ) : (
                displayTools.map((tool) => (
                  <tr 
                    key={tool.toolId}
                    onClick={() => navigate(`/tool/${tool.toolId}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="ps-4 fw-semibold">{tool.toolCode}</td>
                    <td>{tool.toolName}</td>
                    <td className="text-secondary fw-semibold">{tool.minimumQuantity}</td>
                    <td>
                     <span className={`badge ${Number(tool.availableQuantity) >= Number(tool.minimumQuantity) ? 'bg-success' : 'bg-danger'} rounded-pill px-3`}>
                        {tool.availableQuantity}
                      </span>
                    </td>
                    <td className="text-secondary fw-semibold">
                      {tool.storageLocation ? tool.storageLocation : '-'}
                    </td>
                    <td className="text-secondary fw-bold">{tool.drawingNumber || '-'}</td>
                    <td className="text-secondary fw-bold">{tool.specNumber || '-'}</td>
                    <td>
                      <span className={`text-${tool.status === 'AVAILABLE' ? 'success' : tool.status === 'DAMAGED' ? 'danger' : 'warning'} fw-semibold`} style={{ fontSize: '0.85rem' }}>
                        ● {tool.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      {canManage ? (
                        <>
                          <button 
                            className="btn btn-sm btn-primary fw-bold me-2 shadow-sm" 
                            onClick={(e) => { e.stopPropagation(); navigate(`/tool/${tool.toolId}`); }}
                          >
                            Manage
                          </button>
                          <button 
                            className="btn btn-sm btn-light text-primary me-2 fw-bold" 
                            onClick={(e) => { e.stopPropagation(); navigate(`/edit-tool/${tool.toolId}`); }}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-sm btn-light text-danger fw-bold" 
                            onClick={(e) => { e.stopPropagation(); handleDelete(tool.toolId); }}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="text-primary fw-bold small" style={{ textDecoration: 'none' }}>
                          View History &rarr;
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
