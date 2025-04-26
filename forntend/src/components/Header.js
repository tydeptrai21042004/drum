// frontend/src/components/Header.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Header.css'; // Ensure this file includes the CSS above

const Header = () => {
  const [user, setUser] = useState(null);

  // Load user details from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/api/logout', {
        method: 'POST',
        headers: {
          'x-access-token': token
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    // Remove token and user info from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    // Redirect to login page
    window.location.href = '/login';
  };

  return (
    <header className="app-header">
      <div className="logo">
        <Link to="/">MIXER DRIVE CO.</Link>
      </div>
      <nav className="navigation">
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/calculation">Calculate</Link></li>
          <li><Link to="/workspace">Workspace</Link></li>
          <li><Link to="/direct-chat">Chat</Link></li>

          {user ? (
            <>
              <li className="user-info">
                Logged in as: {user.email} ({user.role})
              </li>
              <li className="auth-links">
                <button className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="auth-links">
                <Link to="/login">Login</Link>
              </li>
              <li className="auth-links">
                <Link to="/register">Register</Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
