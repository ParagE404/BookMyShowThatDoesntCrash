import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // Add Link import
import axios from "axios";
import "./Auth.css";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("/api/auth/login", { email, password });
      const { accessToken, refreshToken, expiresIn } = response.data.data;

      // Store tokens in localStorage for later use
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("expiresIn", expiresIn);

      // Notify parent or redirect to protected page
      onLogin();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Login failed");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🎫 Welcome Back</h1>
          <p>Sign in to join the virtual queue for Coldplay Mumbai 2025</p>
        </div>
        <form onSubmit={handleSubmit}>
          <h2>Login</h2>
          {error && <p className="error">{error}</p>}
          <label>
            Email:
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password:
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit">Login</button>
        </form>
        <div className="auth-footer">
          <p>
            Don't have an account?{" "}
            <Link to="/register" className="auth-link">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
