// frontend/src/components/Home.js
import React, { Suspense, useState } from 'react';
import Slider from "react-slick"; // Import Slider component

// Import react-slick CSS
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import './Home.css'; // Import the CSS file
// Ensure the path to DriveSystem3D is correct
const DriveSystem3D = React.lazy(() => import('./DriveSystem3D')); // Lazy load the 3D component

const Home = () => {
  const [feedback, setFeedback] = useState('');
  // --- State for 3D Interaction ---
  const [motorSpeed, setMotorSpeed] = useState(2); // Initial speed (rad/s)
  const [isRunning, setIsRunning] = useState(true); // Animation status
  // --- End State for 3D Interaction ---

  // Slider settings
  const sliderSettings = { /* ... slider settings ... */
     dots: true, infinite: true, speed: 500, slidesToShow: 1, slidesToScroll: 1,
     autoplay: true, autoplaySpeed: 3000, pauseOnHover: true,
  };

  // Placeholder images (replace with your actual image paths/URLs)
  const sliderImages = [ /* ... image paths ... */
     '/images/slider-placeholder-1.jpg',
     '/images/slider-placeholder-2.jpg',
     '/images/slider-placeholder-3.jpg',
  ];

  const handleFeedbackSubmit = (e) => { /* ... feedback submit logic ... */
    e.preventDefault();
    if (!feedback.trim()) { alert('Please enter your feedback.'); return; }
    console.log('Feedback submitted:', feedback);
    alert('Thank you for your feedback!');
    setFeedback('');
  };

  return (
    // No container div needed here usually, as App.js provides layout
    <> {/* Use Fragment */}
      {/* --- Welcome Section --- */}
      <section className="home-section welcome-section">
        <h1>Welcome to the Mixer Drive System</h1>
        <p>
          Explore our system features. Below is an interactive 3D representation
          of a drive mechanism. Use your mouse to rotate and zoom.
          Control the simulation using the controls below. {/* Added instruction */}
        </p>

        {/* --- 3D Simulation Container --- */}
        <div className="simulation-container">
          <Suspense fallback={<div className="loading-placeholder">Loading 3D Model...</div>}>
             {/* Pass state down as props to the interactive DriveSystem3D */}
            <DriveSystem3D speed={motorSpeed} isRunning={isRunning} />
          </Suspense>
        </div>

        {/* --- 3D Interaction Controls --- */}
        {/* Add the controls UI below the simulation */}
        <div className="simulation-controls">
          <div className="control-item">
            <label htmlFor="speedSlider">Motor Speed: {motorSpeed.toFixed(1)} rad/s</label>
            <input
              type="range"
              id="speedSlider"
              min="0"
              max="10" // Max speed
              step="0.5"
              value={motorSpeed}
              onChange={(e) => setMotorSpeed(parseFloat(e.target.value))}
            />
          </div>
          <div className="control-item">
            <button onClick={() => setIsRunning(!isRunning)} className="start-stop-btn">
              {isRunning ? 'Stop ■' : 'Start ▶'}
            </button>
          </div>
        </div>
        {/* --- End 3D Interaction Controls --- */}

      </section>

      {/* --- About Us Section --- */}
      <section className="home-section about-us-section">
         {/* ... About Us content ... */}
         <h2>About Us</h2>
         <div className="about-content">
           <div className="about-text">
             <p>We specialize in providing robust and efficient mixer drive systems tailored to your needs. With years of experience and cutting-edge technology, we ensure optimal performance and reliability.</p>
             <p>Our commitment is to quality, innovation, and customer satisfaction. Learn more about how our drive systems can benefit your operations.</p>
           </div>
           <div className="image-slider-container">
             <Slider {...sliderSettings}>
               {sliderImages.map((imgSrc, index) => (
                 <div key={index}>
                   <img src={imgSrc} alt={`About Us Slide ${index + 1}`} className="slider-image"/>
                 </div>
               ))}
             </Slider>
           </div>
        </div>
      </section>

      {/* --- Feedback Section --- */}
      <section className="home-section feedback-section">
         {/* ... Feedback content ... */}
         <h2>Share Your Feedback</h2>
        <p>We value your opinion. Please let us know how we can improve.</p>
        <form onSubmit={handleFeedbackSubmit} className="feedback-form">
          <textarea
            placeholder="Enter your feedback here..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={5}
            required
          />
          <button type="submit" className="feedback-submit-btn">Submit Feedback</button>
        </form>
      </section>
    </>
  );
};

export default Home;