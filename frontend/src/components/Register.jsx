// frontend/src/components/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../config/api';
import './Auth.css';

export default function Register({ onRegister }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // First Name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    // Last Name validation
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    setValidationErrors({});

    try {
      // Register user
      const registerResponse = await apiClient.post('/api/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      });

      console.log('Registration successful:', registerResponse.data);

      // Automatically log in after successful registration
      const loginResponse = await apiClient.post('/api/auth/login', {
        email: formData.email,
        password: formData.password
      });

      // Store tokens
      localStorage.setItem('accessToken', loginResponse.data.data.accessToken);
      localStorage.setItem('refreshToken', loginResponse.data.data.refreshToken);

      // Call parent callback
      if (onRegister) {
        onRegister();
      }

      // Navigate to queue
      navigate('/queue');

    } catch (err) {
      console.error('Registration error:', err);
      
      if (err.response?.data?.error) {
        setError(err.response.data.error.message);
      } else if (err.response?.status === 409) {
        setError('An account with this email already exists. Please login instead.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🎫 Create Your Account</h1>
          <p>Join thousands of music fans getting tickets fair and fast</p>
        </div>

        {error && (
          <div className="auth-error">
            <span>❌ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={validationErrors.firstName ? 'error' : ''}
                placeholder="Enter your first name"
                disabled={loading}
              />
              {validationErrors.firstName && (
                <span className="field-error">{validationErrors.firstName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={validationErrors.lastName ? 'error' : ''}
                placeholder="Enter your last name"
                disabled={loading}
              />
              {validationErrors.lastName && (
                <span className="field-error">{validationErrors.lastName}</span>
              )}
            </div>
          </div>

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
              placeholder="Create a strong password"
              disabled={loading}
            />
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
            <div className="password-requirements">
              <span>Password must contain at least 8 characters with uppercase, lowercase, and number</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={validationErrors.confirmPassword ? 'error' : ''}
              placeholder="Confirm your password"
              disabled={loading}
            />
            {validationErrors.confirmPassword && (
              <span className="field-error">{validationErrors.confirmPassword}</span>
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
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>

        <div className="auth-benefits">
          <h4>🎵 Why Join Us?</h4>
          <ul>
            <li>✅ Fair virtual queue system</li>
            <li>✅ Real-time position updates</li>
            <li>✅ Secure booking process</li>
            <li>✅ No more crashes or timeouts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
