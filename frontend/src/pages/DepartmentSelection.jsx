import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config'; 
import { getUserRole, isOwner } from '../permissions';

export default function DepartmentSelection() {
  const navigate = useNavigate();
  
  // 1. Pull the user's role and the Plant they just clicked on
  const userRole = getUserRole();
  const activePlantId = localStorage.getItem('activePlantId');
  
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userRole) {
      navigate('/login');
      return;
    }
    if (!activePlantId) {
      navigate('/plant-selection');
      return;
    }

    const fetchDepartments = async () => {
      const cacheKey = `departments_plant_${activePlantId}`;
      const cachedData = sessionStorage.getItem(cacheKey);

      if (cachedData) {
        // Load everything from cache (API filter removed so all cards show)
        setDepartments(JSON.parse(cachedData));
        setIsLoading(false);
        return; 
      }

      try {
        // The API already filters by activePlantId due to your backend route!
        const response = await axios.get(`${API_URL}/api/departments/${activePlantId}`);
        
        if (Array.isArray(response.data)) {
          sessionStorage.setItem(cacheKey, JSON.stringify(response.data));
          setDepartments(response.data);
        } else {
          setError("Invalid data received from server.");
        }
      } catch (err) {
        console.error("Error fetching departments", err);
        setError("Failed to connect to the database.");
      } finally {
        setIsLoading(false);
      }
    };  
    
    fetchDepartments();
  }, [userRole, activePlantId, navigate]);

  // ==========================================
  // 🚀 THE COMPOUND SECURITY CHECK
  // ==========================================
  const handleSelectDepartment = (clickedDeptId) => {
    
    // Pull the user's hardcoded profile data from login
    const assignedPlantId = localStorage.getItem('assignedPlantId');
    const assignedDeptId = localStorage.getItem('assignedDeptId');

    // If they are not an OWNER, enforce the rules strictly
    if (!isOwner(userRole)) {
      // If the user has no assigned plant, deny access (prevents implicit OWNER access)
      if (!assignedPlantId || assignedPlantId === 'null') {
        setError("Access Denied: No facility assigned to your account. Contact the administrator.");
        setTimeout(() => setError(null), 3000);
        return;
      }

      // RULE 1: Check the Plant Hierarchy (Does this Plant match their profile?)
      if (activePlantId !== assignedPlantId) {
        setError("Access Denied: You cannot access departments inside this facility.");
        setTimeout(() => setError(null), 3000);
        return; // Block navigation!
      }

      // If the user has no assigned department, deny access
      if (!assignedDeptId || assignedDeptId === 'null') {
        setError("Access Denied: No department assigned to your account. Contact the administrator.");
        setTimeout(() => setError(null), 3000);
        return;
      }

      // RULE 2: Check the Department Hierarchy (Does this Dept match their profile?)
      if (clickedDeptId.toString() !== assignedDeptId) {
        setError("Access Denied: You are only authorized to access your assigned department.");
        setTimeout(() => setError(null), 3000);
        return; // Block navigation!
      }
    }

    // If they pass the security checks (or are an OWNER), let them in!
    localStorage.setItem('activeDeptId', clickedDeptId);
    navigate('/project-selection'); 
  };

  return (
    <div className="container-fluid bg-light min-vh-100 py-5 d-flex flex-column align-items-center">
      <div className="w-100 max-w-3xl" style={{ maxWidth: '800px' }}>
        
        <button className="btn btn-outline-secondary mb-4 shadow-sm" onClick={() => navigate('/plant-selection')}>
          ← Back to Facilities
        </button>

        <div className="mb-4">
          <h2 className="fw-bold text-primary mb-1">Step 2: Select Department</h2>
          <span className="text-muted">Choose your department within the facility</span>
        </div>

        {/* 🚀 Access Denied Error Banner */}
        {error && (
          <div className="alert alert-danger fw-bold shadow-sm rounded-3 mb-4">
            <i className="bi bi-shield-lock-fill me-2"></i> {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="text-muted mt-2">Loading departments...</p>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 g-4">
            {departments.length === 0 ? (
              <p className="text-muted text-center w-100 mt-4">No departments found for this facility.</p>
            ) : (
              departments.map((d) => (
                <div key={d.departmentId} className="col">
                  <div 
                    className="card h-100 panel-card border-0 rounded-4 p-3" 
                    style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                    onClick={() => handleSelectDepartment(d.departmentId)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div className="card-body text-center">
                      <h4 className="fw-bold text-dark mb-0">{d.departmentName}</h4>
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
