// frontend/src/components/Footer.js
import React from 'react';
import './Footer.css'; // We'll create this CSS file next

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="contact-info">
          <h4>Contact Us</h4>
          <p>123 Drive System Ave, Binh Duong, Vietnam</p>
          <p>Email: <a href="mailto:info@mixerdrive.example.com">info@mixerdrive.example.com</a></p>
          <p>Phone: +84 123 456 789</p>
        </div>
        <div className="footer-links">
          {/* Add links if needed, e.g., Privacy Policy, Terms */}
          {/* <a href="/privacy">Privacy Policy</a> */}
        </div>
      </div>
      <div className="copyright">
        &copy; {currentYear} Mixer Drive Co. All Rights Reserved.
      </div>
    </footer>
  );
};

export default Footer;