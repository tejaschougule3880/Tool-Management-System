import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import { canManageInventory } from '../permissions';

export default function AddTool() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const activeProjectId = localStorage.getItem('activeProjectId');

  useEffect(() => {
    if (!canManageInventory(userRole)) {
      navigate('/dashboard');
    }
  }, [userRole, navigate]);

  const [formData, setFormData] = useState({
    toolCode: '',
    toolName: '',
    drawingNumber: '',
    specNumber: '',
    minimumQuantity: '',
    storageLocation: ''
  });

 const [serials, setSerials] = useState([]);
  const [message, setMessage] = useState(null);

  const handleQuantityChange = (e) => {
    let newQty = parseInt(e.target.value);
    // 🚀 Change the fallback to 0 instead of 1
    if (isNaN(newQty) || newQty < 0) newQty = 0; 

    const newSerials = [...serials];
    while (newSerials.length < newQty) {
      newSerials.push('');
    }
    if (newSerials.length > newQty) {
      newSerials.length = newQty;
    }
    setSerials(newSerials);
  };

  const handleSerialChange = (index, value) => {
    const updatedSerials = [...serials];
    updatedSerials[index] = value;
    setSerials(updatedSerials);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (serials.some(s => s.trim() === '')) {
      alert("Please fill out all serial number fields, or reduce the Total Stock.");
      return;
    }

    const uniqueSerials = new Set(serials);
    if (uniqueSerials.size !== serials.length) {
      alert("You cannot enter duplicate serial numbers for the same tool.");
      return;
    }

    try {
      const payload = {
        ...formData,
        projectId: activeProjectId ? parseInt(activeProjectId) : null,
        serials: serials 
      };

      const response = await axios.post(`${API_URL}/api/tools`, payload);
      if (response.data.status === true) {
        setMessage({ type: 'success', text: response.data.message });
        setTimeout(() => navigate('/dashboard'), 1000);
      }
    } catch (error) {
      setMessage({ type: 'danger', text: 'Error connecting to server.' });
    }
  };

  return (
    <div className="container mt-5 mb-5">
      <button className="btn btn-outline-secondary mb-4" onClick={() => navigate('/dashboard')}>
        ← Back to Dashboard
      </button>
      
      <div className="card panel-card border-0 mx-auto" style={{ maxWidth: '600px' }}>
        <div className="card-header bg-white py-3">
          <h4 className="mb-0 fw-bold text-gradient-primary">Add New Tool</h4>
          <p className="text-muted small mb-0">Add tool metadata and initial stock with spec number support.</p>
        </div>
        
        <div className="card-body p-4">
          {message && (
            <div className={`alert alert-${message.type} rounded-3`}>{message.text}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Tool Code</label>
              <input type="text" className="form-control bg-light" placeholder="e.g., EM-10-CAR"
                value={formData.toolCode} 
                onChange={(e) => setFormData({...formData, toolCode: e.target.value})} />
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Tool Name</label>
              <input type="text" className="form-control bg-light" required placeholder="e.g., 10mm Carbide End Mill"
                value={formData.toolName} 
                onChange={(e) => setFormData({...formData, toolName: e.target.value})} />
            </div>
            
            {/* 🚀 NEW: Drawing Number Input */}
            <div className="mb-4">
              <label className="form-label fw-semibold">Drawing Number (Optional)</label>
              <input type="text" className="form-control bg-light" placeholder="e.g., DWG-1029"
                value={formData.drawingNumber} 
                onChange={(e) => setFormData({...formData, drawingNumber: e.target.value})} />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Spec Number (Optional)</label>
              <input type="text" className="form-control bg-light" placeholder="e.g., SPEC-1234"
                value={formData.specNumber} 
                onChange={(e) => setFormData({...formData, specNumber: e.target.value})} />
              <div className="form-text text-muted">Non-unique spec numbers are allowed and may be left blank.</div>
            </div>

            <div className="row mb-3">
              <div className="col">
                <label className="form-label fw-semibold">Min Quantity Alert</label>
                <input type="number" className="form-control bg-light" required min="0"
                  value={formData.minimumQuantity} 
                  onChange={(e) => setFormData({...formData, minimumQuantity: e.target.value})} />
              </div>
              <div className="col">
                <label className="form-label fw-semibold text-primary">Initial Total Stock</label>
                <input type="number" className="form-control border-primary" required min="0"
                  value={serials.length} 
                  onChange={handleQuantityChange} />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Storage Location</label>
              <input type="text" className="form-control bg-light" required placeholder="e.g., Drawer A2"
                value={formData.storageLocation} 
                onChange={(e) => setFormData({...formData, storageLocation: e.target.value})} />
            </div>

            <div className="mb-4 p-3 border rounded bg-light">
              <label className="form-label fw-bold mb-3">Scan or Type Serial Numbers</label>
              <div className="row g-2">
                {serials.map((serial, index) => (
                  <div key={index} className="col-md-6">
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-white text-muted fw-bold">#{index + 1}</span>
                      <input 
                        type="text" 
                        className="form-control border-start-0" 
                        placeholder="Enter OEM Serial..."
                        required
                        value={serial}
                        onChange={(e) => handleSerialChange(index, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100 fw-bold py-2 rounded-pill shadow-sm">
              Save Tool & Serials
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
