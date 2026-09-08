import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import { getUserRole, isOwner } from '../permissions';

export default function PlantSelection() {
  const navigate = useNavigate();
  const userRole = getUserRole();
  const [plants, setPlants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // 🚀 NEW: State to hold access denied messages

  useEffect(() => {
    if (!userRole) {
      navigate('/login');
      return;
    }

    const fetchPlants = async () => {
      const cachedPlants = sessionStorage.getItem('cachedPlants');

      if (cachedPlants) {
        // 🚀 REMOVED FILTER: Load everything from cache
        setPlants(JSON.parse(cachedPlants));
        setIsLoading(false);
        return; 
      }

      try {
        const response = await axios.get(`${API_URL}/api/plants`);
        sessionStorage.setItem('cachedPlants', JSON.stringify(response.data));
        // 🚀 REMOVED FILTER: Load everything from API
        setPlants(response.data);
      } catch (err) {
        console.error("Error fetching plants", err);
        setError("Failed to load facilities.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlants();
  }, [userRole, navigate]);

  const handleSelectPlant = (plantId) => {
    const assignedPlantId = localStorage.getItem('assignedPlantId');

    // 🚀 NEW SECURITY CHECK: Deny non-OWNER users who have no assigned facility
    if (!isOwner(userRole)) {
      if (!assignedPlantId || assignedPlantId === 'null') {
        setError("Access Denied: No facility assigned to your account. Contact the administrator.");
        setTimeout(() => setError(null), 3000);
        return; // Block navigation when there's no assigned plant
      }

      if (plantId.toString() !== assignedPlantId) {
        setError("Access Denied: You are not authorized to access this facility.");
        setTimeout(() => setError(null), 3000); // Clear the error after 3 seconds
        return; // Stops them from navigating!
      }
    }

    localStorage.setItem('activePlantId', plantId);
    navigate('/department-selection');
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  const handleBackToMenu = () => {
    localStorage.removeItem('activePlantId');
    localStorage.removeItem('activeDeptId');
    localStorage.removeItem('activeProjectId');
    localStorage.removeItem('activeProjectName');
    navigate('/owner-menu');
  };

  return (
    <div className="container-fluid bg-light min-vh-100 py-5 d-flex flex-column align-items-center">
      <div className="w-100" style={{ maxWidth: '900px' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold text-primary mb-1">Select Facility</h2>
          </div>
          <div className="d-flex gap-2">
            {isOwner(userRole) && (
              <button className="btn btn-outline-primary btn-sm rounded-pill px-4 fw-bold" onClick={handleBackToMenu}>
                Back to Menu
              </button>
            )}
            <button className="btn btn-outline-danger btn-sm rounded-pill px-4 fw-bold" onClick={handleLogout}>
              Logout
            </button>
          </div>
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
           </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 g-4">
            {plants.length === 0 ? (
               <p className="text-muted text-center w-100 mt-5">No facilities available.</p>
            ) : (
              plants.map(p => (
                <div key={p.plantId} className="col">
                  <div 
                    className="card h-100 panel-card border-0 rounded-4 overflow-hidden"
                    style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                    onClick={() => handleSelectPlant(p.plantId)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <img 
                      src={`/${p.imageName}`} 
                      alt={p.plantName} 
                      className="card-img-top p-3" 
                      style={{ height: '200px', objectFit: 'contain', backgroundColor: '#ffffff' }}
                      onError={(e) => { e.target.src = '/default-plant.png' }}
                    />
                    <div className="card-body text-center py-4">
                      <h4 className="fw-bold text-dark mb-1">{p.plantName}</h4>
                      {/* Removed the 'Unknown Location' fallback */}
                      {p.location && <p className="text-muted mb-0"><i className="bi bi-geo-alt-fill me-2"></i>{p.location}</p>}
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
