// WorkspaceList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WorkspaceList.css';

const WorkspaceList = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/workspace/list', {
        headers: { 'x-access-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
      } else {
        console.error('Failed to fetch workspaces');
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    }
  };

  return (
    <div className="workspace-list-container">
      <h2>Your Workspaces</h2>
      <ul>
        {workspaces.map(ws => (
          <li key={ws._id} onClick={() => navigate(`/workspace/${ws.code}`)}>
            {ws.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WorkspaceList;
