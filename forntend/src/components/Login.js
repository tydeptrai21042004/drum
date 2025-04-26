// frontend/src/components/Login.js
import React, { useState } from 'react';
import './Login.css'; // Import the CSS file

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'error' or 'success'
  const [showPassword, setShowPassword] = useState(false); // State for password visibility

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages
    setMessageType('');

    if (!email || !password) {
      setMessage('Please enter both email and password.');
      setMessageType('error');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/login', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();

      if (res.ok) {
        setMessage('Login successful!');
        setMessageType('success');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Redirect based on user role
        if (data.user.role === 'admin') {
          window.location.href = '/admin/users';
        } else {
          window.location.href = '/workspace';
        }
      } else {
        setMessage(data.message || 'Login failed. Please check your credentials.');
        setMessageType('error');
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage('An error occurred during login. Please try again later.');
      setMessageType('error');
    }
  };

  // Function to toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <h2>Login</h2>

        {/* Email Input */}
        <div className="input-group">
          <input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Password Input Wrapper */}
        <div className="password-wrapper">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Submit Button */}
        <button type="submit" className="login-btn">Login</button>

        {/* Message Area */}
        {message && (
          <p className={`login-message ${messageType === 'success' ? 'success' : ''}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
};

export default Login;
