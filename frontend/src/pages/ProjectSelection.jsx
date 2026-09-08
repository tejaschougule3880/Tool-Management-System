import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import { canManageInventory, getUserRole } from '../permissions';

export default function ProjectSelection() {
  const navigate = useNavigate();
  const userRole = getUserRole();
  const canManage = canManageInventory(userRole);
  const activeDeptId = localStorage.getItem('activeDeptId');
  
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newProjectName, setNewProjectName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const cacheKey = `projects_dept_${activeDeptId}`;

  useEffect(() => {
    if (!userRole) { navigate('/login'); return; }
    if (!activeDeptId) { navigate('/department-selection'); return; }
    fetchProjects();
  }, [userRole, activeDeptId, navigate]);

  const fetchProjects = async () => {
    // 🚀 CACHE CHECK
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      setProjects(JSON.parse(cachedData));
      setIsLoading(false);
      return; 
    }

    try {
      const response = await axios.get(`${API_URL}/api/projects/${activeDeptId}`);
      if (Array.isArray(response.data)) {
        setProjects(response.data);
        sessionStorage.setItem(cacheKey, JSON.stringify(response.data)); // 🚀 SAVE CACHE
      } else {
        setError("Invalid data received from server.");
      }
    } catch (err) {
      console.error("Error fetching projects", err);
      setError("Failed to connect to the database.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = (projectId, projectName) => {
    localStorage.setItem('activeProjectId', projectId);
    localStorage.setItem('activeProjectName', projectName); // Save name for the dashboard header
    navigate('/dashboard'); 
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    setIsAdding(true);
    try {
      const payload = {
        projectName: newProjectName,
        departmentId: parseInt(activeDeptId)
      };
      
      const response = await axios.post(`${API_URL}/api/projects`, payload);
      if (response.data.status) {
        setNewProjectName('');
        sessionStorage.removeItem(cacheKey); // 🚀 WIPE CACHE to force fresh fetch
        fetchProjects();
      }
    } catch {
      alert("Failed to add project.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteProject = async (e, projectId, projectName) => {
    e.stopPropagation();
    
    if (window.confirm(`Are you sure you want to delete the workspace for "${projectName}"? You cannot delete a project if tools are currently assigned to it.`)) {
      try {
        const response = await axios.delete(`${API_URL}/api/projects/${projectId}`);
        if (response.data.status) {
          const updatedProjects = projects.filter(p => p.projectId !== projectId);
          setProjects(updatedProjects);
          sessionStorage.setItem(cacheKey, JSON.stringify(updatedProjects)); // 🚀 UPDATE CACHE
        }
      } catch {
        alert("Cannot delete project. Make sure no tools are assigned to it first.");
      }
    }
  };

  const filteredProjects = projects.filter(project => 
    project.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container-fluid bg-light min-vh-100 py-5 d-flex flex-column align-items-center">
      <div className="w-100 max-w-3xl" style={{ maxWidth: '800px' }}>
        
        <button className="btn btn-outline-secondary mb-4 shadow-sm" onClick={() => navigate('/department-selection')}>
          ← Back to Departments
        </button>

        <div className="mb-4">
          <h2 className="fw-bold text-primary mb-1">Step 3: Select a Project</h2>
          <span className="text-muted">Choose your active workspace to view its tool inventory</span>
        </div>

        {error && <div className="alert alert-danger fw-bold">{error}</div>}

        <div className="row mb-4">
          <div className="col-md-6 mb-3 mb-md-0">
            <div className="card border-0 shadow-sm rounded-4 p-2 bg-white h-100 d-flex align-items-center justify-content-center">
              <div className="input-group w-100">
                <span className="input-group-text bg-transparent border-0 pe-1">
                  <i className="bi bi-search text-muted fs-5"></i>
                </span>
                <input
                  type="text"
                  className="form-control form-control-lg bg-light border-0 shadow-none rounded-3 ms-2"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {canManage && (
            <div className="col-md-6">
              <div className="card border-0 shadow-sm rounded-4 p-2 bg-white">
                <form onSubmit={handleAddProject} className="d-flex gap-2 align-items-center mb-0">
                  <input 
                    type="text" 
                    className="form-control form-control-lg bg-light border-0 shadow-none rounded-3" 
                    placeholder="New project name..."
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    disabled={isAdding}
                  />
                  <button type="submit" className="btn btn-success btn-lg px-3 fw-bold rounded-3 shadow-sm text-nowrap" disabled={isAdding}>
                    {isAdding ? 'Adding...' : '+ Add Project'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
           <div className="text-center py-5">
             <div className="spinner-border text-primary" role="status"></div>
           </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 g-4">
            {!error && projects.length === 0 ? (
              <div className="col-12 text-center py-5">
                <p className="text-muted fs-5">No projects found for this department.</p>
              </div>
            ) : !error && filteredProjects.length === 0 ? (
              <div className="col-12 text-center py-5">
                <p className="text-muted fs-5">No projects match your search.</p>
              </div>
            ) : (
              filteredProjects.map((p) => (
                <div key={p.projectId} className="col">
                  <div 
                    className="card h-100 panel-card border-0 rounded-4 p-3 position-relative" 
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    onClick={() => handleSelectProject(p.projectId, p.projectName)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 0.125rem 0.25rem rgba(0,0,0,0.075)';
                    }}
                  >
                    <div className="card-body d-flex justify-content-between align-items-center">
                      <h4 className="fw-bold text-dark mb-0">{p.projectName}</h4>
                      
                      {canManage && (
                        <button 
                          className="btn btn-outline-danger btn-sm border-0 px-2"
                          title="Delete Project"
                          onClick={(e) => handleDeleteProject(e, p.projectId, p.projectName)}
                        >
                          <i className="bi bi-trash"></i> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
