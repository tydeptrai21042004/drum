// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Workspace from './components/Workspace';
import Calculation from './components/Calculation';
import DirectChat from './components/DirectChat';
import WorkspaceChat from './components/WorkspaceChat';
import AdminUsers from './components/AdminUsers'; // Import the new admin page
import './App.css'; // Import App specific CSS for layout
import Footer from './components/Footer';
import WorkspaceDetailPage from './components/WorkspaceDetailPage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/calculation" element={<Calculation />} />
            {/* Direct Chat route expects a URL parameter for the other user's ID */}
            <Route path="/direct-chat" element={<DirectChat />} />
            {/* Workspace Chat route expects a URL parameter for the workspace ID */}
            <Route path="/workspace-chat/:workspaceId" element={<WorkspaceChat />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="*" element={<div>404 - Not Found</div>} />
          </Routes>
        </main>
        <Footer />

      </div>
    </Router>
  );
}

export default App;
