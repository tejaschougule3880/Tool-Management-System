import { useNavigate } from 'react-router-dom';
import { getUserRole, isOwner } from '../permissions';

export default function OwnerMenu() {
  const navigate = useNavigate();
  const userRole = getUserRole();

  if (!isOwner(userRole)) {
    navigate('/dashboard');
    return null;
  }

  const handleManageInventory = () => {
    localStorage.removeItem('activeProjectId');
    localStorage.removeItem('activeProjectName');
    localStorage.removeItem('activePlantId');
    localStorage.removeItem('activeDeptId');
    navigate('/plant-selection');
  };

  const handleManageUsers = () => {
    navigate('/owner-users');
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <div className="container-fluid owner-menu-page d-flex align-items-center justify-content-center vh-100">
      <div className="text-center">
        <div className="mb-5">
          <h1 className="fw-bold text-white mb-2">Welcome, Admin</h1>
          <p className="text-white-50 fs-5">Select what you'd like to do</p>
        </div>

        <div className="row g-4 justify-content-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Manage Inventory Card */}
          <div className="col-md-5">
            <div 
              className="card h-100 border-0 rounded-4 shadow-lg overflow-hidden"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease-in-out' }}
              onClick={handleManageInventory}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="card-body p-5 text-center bg-white d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '300px' }}>
                <div className="mb-4">
                  <i className="bi bi-box-seam" style={{ fontSize: '4rem', color: '#667eea' }}></i>
                </div>
                <h4 className="fw-bold text-dark mb-2">Manage Inventory</h4>
                <p className="text-muted small mb-0">View tools, manage stock, and track movements across all facilities</p>
              </div>
            </div>
          </div>

          {/* Manage Users Card */}
          <div className="col-md-5">
            <div 
              className="card h-100 border-0 rounded-4 shadow-lg overflow-hidden"
              style={{ cursor: 'pointer', transition: 'all 0.3s ease-in-out' }}
              onClick={handleManageUsers}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="card-body p-5 text-center bg-white d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '300px' }}>
                <div className="mb-4">
                  <i className="bi bi-people-fill" style={{ fontSize: '4rem', color: '#764ba2' }}></i>
                </div>
                <h4 className="fw-bold text-dark mb-2">Manage Users</h4>
                <p className="text-muted small mb-0">Create, assign facilities/departments, and remove user accounts</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button 
            className="btn btn-outline-light fw-bold rounded-pill px-5 py-2"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
