// frontend/src/components/Register.js
import React, { useState } from 'react';
import './Register.css'; // Import the CSS file

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // State for confirm password
  const [showPassword, setShowPassword] = useState(false); // State for password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // State for confirm password visibility
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'error' or 'success'
  const [passwordError, setPasswordError] = useState(''); // State specifically for password mismatch

  const handleRegister = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setMessage('');     // Clear previous messages
    setMessageType('');
    setPasswordError(''); // Clear previous password error

    // Basic validation
    if (!email || !password || !confirmPassword) {
      setMessage('Please fill in all fields.');
      setMessageType('error');
      return;
    }

    // *** Password Match Validation ***
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return; // Stop the registration process
    }

    // If passwords match, proceed with API call
    try {
      const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only send email and password to the backend
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      setMessage(data.message || 'An unexpected response occurred.'); // Set message from backend
      if (res.ok) {
        setMessageType('success');
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      } else {
        setMessageType('error');
      }
    } catch (error) {
      console.error("Registration error:", error);
      setMessage('An error occurred during registration. Please try again later.');
      setMessageType('error');
    }
  };

  // Toggle functions for password visibility
  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleRegister}>
        <h2>Register</h2>

        {/* Email Input */}
        <div className="input-group">
          <label htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Password Input */}
        <div className="password-wrapper input-group">
          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={toggleShowPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Confirm Password Input */}
        <div className="password-wrapper input-group">
          <label htmlFor="reg-confirm-password">Confirm Password</label>
          <input
            id="reg-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={toggleShowConfirmPassword}
            aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
          >
            {showConfirmPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Password Match Error Display */}
        {passwordError && <p className="password-error">{passwordError}</p>}

        {/* Submit Button */}
        <button type="submit" className="register-btn">Register</button>

        {/* General Message Area */}
        {message && (
          <p className={`register-message ${messageType}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
};

export default Register;
