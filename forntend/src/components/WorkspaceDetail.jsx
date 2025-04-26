// WorkspaceDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './WorkspaceDetail.css';

const WorkspaceDetail = () => {
  const { code } = useParams();
  const token = localStorage.getItem('token');
  const currentUserId = localStorage.getItem('userId');
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchWorkspaceDetail();
  }, []);

  const fetchWorkspaceDetail = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/workspace/detail/${code}`, {
        headers: { 'x-access-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data.workspace);
      } else {
        setMessage('Failed to fetch workspace details');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Network error fetching workspace details');
    }
  };

  const handleKick = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await fetch('http://localhost:5000/api/workspace/kick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token
        },
        body: JSON.stringify({ workspace_id: workspace._id, member_id: memberId })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        // Remove kicked member from state
        setWorkspace({
          ...workspace,
          members: workspace.members.filter(member => member._id !== memberId)
        });
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Error kicking member:', error);
      setMessage('Network error kicking member');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this workspace?')) return;
    try {
      const res = await fetch('http://localhost:5000/api/workspace/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token
        },
        body: JSON.stringify({ workspace_id: workspace._id })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        // Redirect to workspace list after deletion
        navigate('/');
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Error deleting workspace:', error);
      setMessage('Network error deleting workspace');
    }
  };

  return (
    <div className="workspace-detail-container">
      {workspace ? (
        <>
          <h2>{workspace.name}</h2>
          <button onClick={() => navigate(`/workspace-chat/${workspace.code}`)}>Go to Chat</button>
          <div className="members-section">
            <h3>Members</h3>
            <ul>
              {workspace.members.map(member => (
                <li key={member._id}>
                  {member.email}
                  {workspace.owner === currentUserId && member._id !== currentUserId && (
                    <button onClick={() => handleKick(member._id)}>Kick</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {workspace.owner === currentUserId && (
            <button className="delete-btn" onClick={handleDelete}>Delete Workspace</button>
          )}
          {message && <p className="message">{message}</p>}
        </>
      ) : (
        <p>Loading workspace details...</p>
      )}
    </div>
  );
};

export default WorkspaceDetail;
