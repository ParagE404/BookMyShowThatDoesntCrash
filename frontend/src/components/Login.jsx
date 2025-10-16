// frontend/src/components/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../config/api";
import "./Auth.css";

export default function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
    
    // Clear general error when user starts typing
    if (error) {
      setError("");
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Email validation
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 3) {
      errors.password = "Password must be at least 3 characters";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    setValidationErrors({});

    try {
      console.log("📡 Attempting login with:", { email: formData.email });
      
      const response = await apiClient.post("/api/auth/login", {
        email: formData.email,
        password: formData.password
      });
      
      console.log("✅ Login successful:", response.data);
      
      const { accessToken, refreshToken } = response.data.data;

      // Store tokens in localStorage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      // Call parent callback
      if (onLogin) {
        onLogin();
      }

      // Navigate to event selection
      navigate('/choose-event');

    } catch (err) {
      console.error("❌ Login error:", err);
      
      let errorMessage = "Login failed. Please try again.";
      
      if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err.response?.status === 401) {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (err.response?.status === 404) {
        errorMessage = "Account not found. Please register first.";
      } else if (err.code === 'NETWORK_ERROR') {
        errorMessage = "Network error. Please check your connection.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🎫 Welcome Back</h1>
          <p>Sign in to access exclusive events and join virtual queues</p>
        </div>

        {error && (
          <div className="auth-error">
            <span>❌ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={validationErrors.email ? 'error' : ''}
              placeholder="Enter your email address"
              disabled={loading}
              autoComplete="email"
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={validationErrors.password ? 'error' : ''}
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
            />
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner small" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{" "}
            <Link to="/register" className="auth-link">
              Create Account
            </Link>
          </p>
        </div>

        <div className="auth-demo a-c">
          <h4>🎭 Demo Credentials</h4>
          <div className="demo-credentials">
            <div className="demo-account">
              <strong>Email:</strong> coldplay@fan.com<br />
              <strong>Password:</strong> password123
            </div>
            <button 
              type="button"
              className="btn btn-secondary demo-fill-btn"
              onClick={() => {
                setFormData({
                  email: "coldplay@fan.com",
                  password: "password123"
                });
                setError("");
                setValidationErrors({});
              }}
              disabled={loading}
            >
              Use Demo Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
