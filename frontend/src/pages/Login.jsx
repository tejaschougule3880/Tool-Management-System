import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config'; 
import logoImage from '../assets/etgp.jpg'; 

export default function Login() {
  const navigate = useNavigate();
  
  // --- UI STATE MACHINE ---
  const [currentStep, setCurrentStep] = useState('LOGIN'); 
  const [message, setMessage] = useState('');

  // --- LOGIN STATES ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // --- RESET PASSWORD STATES ---
  const [resetUsername, setResetUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ==========================================
  // API HANDLERS
  // ==========================================

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username: username,
        password: password
      });

      if (response.data.status === true) {
        setMessage('Success: ' + response.data.message);
        // Store JWT token and set default Authorization header for future requests
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        }

        // Clear any previous user assignment state first
        localStorage.removeItem('assignedPlantId');
        localStorage.removeItem('assignedDeptId');
        localStorage.removeItem('activePlantId');
        localStorage.removeItem('activeDeptId');
        localStorage.removeItem('activeProjectId');
        localStorage.removeItem('activeProjectName');

        // Save user role
        const role = String(response.data.role || '').trim().toUpperCase();
        localStorage.setItem('userRole', role);
        localStorage.setItem('username', username);

        // 🚀 Save assigned IDs so the next screens can filter the lists!
        if (response.data.plantId != null) {
          localStorage.setItem('assignedPlantId', response.data.plantId);
        }
        if (response.data.deptId != null) {
          localStorage.setItem('assignedDeptId', response.data.deptId);
        }
        
        // Send every role through the same workspace flow so OWNER sees the full inventory dashboard.
        const nextRoute = '/plant-selection';
        setTimeout(() => navigate(nextRoute), 1000);
        
      } else {
        setMessage('Error: Invalid Credentials');
      }
    } catch (error) {
      // Log full error to console for diagnostics
      console.error('Login error details:', error);

      // Show a more informative message to the user when possible
      if (error.response) {
        const serverMsg = error.response.data?.message || JSON.stringify(error.response.data);
        setMessage(`Error: ${serverMsg}`);
      } else if (error.request) {
        setMessage('Error: No response from server (network or CORS issue).');
      } else {
        setMessage(`Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, {
        username: resetUsername
      });
      if (response.data.status === true) {
        setMessage('Success: ' + response.data.message);
        setCurrentStep('OTP'); 
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error requesting OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, {
        username: resetUsername,
        otp: otp
      });
      if (response.data.status === true) {
        setMessage('Success: ' + response.data.message);
        setCurrentStep('RESET_PASS'); 
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error: Invalid OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage("Error: Passwords do not match!");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
        username: resetUsername,
        newPassword: newPassword
      });
      
      if (response.data.status === true) {
        setMessage('Success: ' + response.data.message);
        setTimeout(() => {
          setCurrentStep('LOGIN');
          setPassword('');
          setResetUsername('');
          setOtp('');
          setNewPassword('');
          setConfirmPassword('');
          setMessage('');
        }, 2000);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error updating password.');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelReset = () => {
    setCurrentStep('LOGIN');
    setMessage('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="container-fluid d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow-lg p-5 border-0 rounded-4" style={{ width: '450px', backgroundColor: '#ffffff' }}>

        <div className="text-center mb-4">
          <img src={logoImage} alt="ETGP Logo" className="mb-3" style={{ maxWidth: '150px' }} />
          <p className="text-muted fw-semibold">Tool Management System</p>
        </div>

        {message && (
          <div className={`alert ${message.startsWith('Success') ? 'alert-success' : 'alert-danger'} rounded-3 small fw-bold`}>
            {message}
          </div>
        )}

        {/* --- SCREEN 1: LOGIN --- */}
        {currentStep === 'LOGIN' && (
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label fw-semibold text-secondary">Username</label>
              <input
                type="text"
                className="form-control form-control-lg bg-light border-0"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold text-secondary">Password</label>
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control form-control-lg bg-light border-0 border-end-0"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="btn bg-light border-0 text-primary fw-semibold"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-100 fw-bold rounded-pill shadow-sm mb-3" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
            
            <div className="text-center">
              <button type="button" className="btn btn-link text-decoration-none small fw-semibold" onClick={() => setCurrentStep('FORGOT_PASS')}>
                Forgot Password?
              </button>
            </div>
          </form>
        )}

        {/* --- SCREEN 2: REQUEST OTP --- */}
        {currentStep === 'FORGOT_PASS' && (
          <form onSubmit={handleRequestOtp}>
            <h5 className="fw-bold text-dark mb-3">Reset Password</h5>
            <p className="text-muted small mb-4">Enter your username to receive a 4-digit OTP via email.</p>
            
            <div className="mb-4">
              <label className="form-label fw-semibold text-secondary">Username</label>
              <input
                type="text"
                className="form-control form-control-lg bg-light border-0"
                placeholder="Enter your username"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-100 fw-bold rounded-pill shadow-sm mb-3" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send OTP"}
            </button>

            <div className="text-center">
              <button type="button" className="btn btn-link text-muted text-decoration-none small fw-semibold" onClick={cancelReset}>
                ← Back to Login
              </button>
            </div>
          </form>
        )}

        {/* --- SCREEN 3: VERIFY OTP --- */}
        {currentStep === 'OTP' && (
          <form onSubmit={handleVerifyOtp}>
            <h5 className="fw-bold text-dark mb-3">Verify OTP</h5>
            <p className="text-muted small mb-4">We sent a 4-digit code to the email registered to <b>{resetUsername}</b>.</p>
            
            <div className="mb-4">
              <label className="form-label fw-semibold text-secondary">Enter 4-Digit OTP</label>
              <input
                type="text"
                className="form-control form-control-lg bg-light border-0 text-center fw-bold fs-4"
                placeholder="* * * *"
                maxLength="4"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-success btn-lg w-100 fw-bold rounded-pill shadow-sm mb-3" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify Code"}
            </button>

            <div className="text-center">
              <button type="button" className="btn btn-link text-muted text-decoration-none small fw-semibold" onClick={cancelReset}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* --- SCREEN 4: RESET PASSWORD --- */}
        {currentStep === 'RESET_PASS' && (
          <form onSubmit={handleResetPassword}>
            <h5 className="fw-bold text-dark mb-4">Create New Password</h5>
            
            <div className="mb-3">
              <label className="form-label fw-semibold text-secondary">New Password</label>
              <div className="input-group">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="form-control form-control-lg bg-light border-0 border-end-0"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button 
                  className="btn bg-light border-0 text-primary fw-semibold" 
                  type="button" 
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold text-secondary">Confirm Password</label>
              <div className="input-group">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-control form-control-lg bg-light border-0 border-end-0"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button 
                  className="btn bg-light border-0 text-primary fw-semibold" 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-100 fw-bold rounded-pill shadow-sm mb-3" disabled={isLoading}>
              {isLoading ? "Updating..." : "Change Password"}
            </button>

            <div className="text-center">
              <button type="button" className="btn btn-link text-muted text-decoration-none small fw-semibold" onClick={cancelReset}>
                Cancel
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
