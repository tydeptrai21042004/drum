import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Workspace.css';

const Workspace = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Retrieve the user object saved during login.
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  // Try to extract the user ID from either _id or id.
  const currentUserId = currentUser ? (currentUser._id || currentUser.id) : null;
  console.log("DEBUG: currentUserId from localStorage:", currentUserId);

  // Debug: Log the current user ID from localStorage.
  if (!currentUserId) {
    console.warn("DEBUG: currentUserId is undefined. Please ensure your login API returns a user object with _id or id.");
  } else {
    console.log("DEBUG: currentUserId from localStorage:", currentUserId);
  }

  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceCode, setWorkspaceCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  const [isLoadingJoin, setIsLoadingJoin] = useState(false);
  const [isLoadingDelete, setIsLoadingDelete] = useState(false);
  const [isLoadingKick, setIsLoadingKick] = useState(false);
  const [isLoadingLeave, setIsLoadingLeave] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);

  // --- Login Prompt ---
  if (!token) {
    return (
      <div className="login-overlay">
        <div className="login-popup">
          <h2>Please Login</h2>
          <p>You must be logged in to manage workspaces.</p>
          <button className="login-popup-button" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // --- Fetch Joined Workspaces ---
  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/workspace/list', {
        headers: { 'x-access-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        console.log("DEBUG: Fetched workspaces:", data.workspaces);
        setWorkspaces(data.workspaces || []);
      } else {
        console.error("DEBUG: Failed to fetch workspaces");
      }
    } catch (error) {
      console.error("DEBUG: Error fetching workspaces:", error);
    }
  };

  // Fetch workspaces on mount.
  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // --- Handle API Response ---
  const handleApiResponse = (data, res, successMsg, errorMsg) => {
    console.log("DEBUG: API response received:", data);
    setMessage(data.message || (res.ok ? successMsg : errorMsg));
    setMessageType(res.ok ? 'success' : 'error');
    if (res.ok && data.workspace) {
      setCurrentWorkspace(data.workspace);
      fetchWorkspaces();
    }
  };

  // --- Create Workspace Handler ---
  const createWorkspace = async () => {
    console.log("DEBUG: createWorkspace called with name:", workspaceName);
    if (!workspaceName.trim()) {
      setMessage('Please enter a workspace name.');
      setMessageType('error');
      return;
    }
    if (workspaces.find(ws => ws.name.toLowerCase() === workspaceName.trim().toLowerCase())) {
      setMessage('A workspace with that name already exists. Please choose a different name.');
      setMessageType('error');
      return;
    }
    setIsLoadingCreate(true);
    setMessage('');
    setMessageType('');
    try {
      const res = await fetch('http://localhost:5000/api/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': token },
        body: JSON.stringify({ name: workspaceName })
      });
      const data = await res.json();
      console.log("DEBUG: Create workspace response:", data);
      handleApiResponse(data, res, 'Workspace created successfully!', 'Error creating workspace.');
    } catch (error) {
      console.error("DEBUG: Error creating workspace:", error);
      setMessage('Network error creating workspace.');
      setMessageType('error');
    } finally {
      setIsLoadingCreate(false);
    }
  };

  // --- Join Workspace Handler ---
  const joinWorkspace = async () => {
    console.log("DEBUG: joinWorkspace called with code:", workspaceCode);
    if (!workspaceCode.trim()) {
      setMessage('Please enter a workspace code.');
      setMessageType('error');
      return;
    }
    setIsLoadingJoin(true);
    setMessage('');
    setMessageType('');
    try {
      const res = await fetch('http://localhost:5000/api/workspace/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': token },
        body: JSON.stringify({ code: workspaceCode })
      });
      const data = await res.json();
      console.log("DEBUG: Join workspace response:", data);
      handleApiResponse(data, res, 'Successfully joined workspace!', 'Error joining workspace.');
    } catch (error) {
      console.error("DEBUG: Error joining workspace:", error);
      setMessage('Network error joining workspace.');
      setMessageType('error');
    } finally {
      setIsLoadingJoin(false);
    }
  };

  // --- Delete Workspace Handler ---
  const deleteWorkspace = async (workspaceId) => {
    console.log("DEBUG: deleteWorkspace called for workspaceId:", workspaceId);
    if (!window.confirm('Are you sure you want to delete this workspace?')) return;
    setIsLoadingDelete(true);
    setMessage('');
    setMessageType('');
    try {
      const res = await fetch('http://localhost:5000/api/workspace/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-access-token': token },
        body: JSON.stringify({ workspace_id: workspaceId })
      });
      const data = await res.json();
      console.log("DEBUG: Delete workspace response:", data);
      if (res.ok) {
        setMessage(data.message || 'Workspace deleted successfully!');
        setMessageType('success');
        if (currentWorkspace && currentWorkspace._id === workspaceId) {
          setCurrentWorkspace(null);
        }
        fetchWorkspaces();
      } else {
        setMessage(data.message || 'Error deleting workspace.');
        setMessageType('error');
      }
    } catch (error) {
      console.error("DEBUG: Error deleting workspace:", error);
      setMessage('Network error deleting workspace.');
      setMessageType('error');
    } finally {
      setIsLoadingDelete(false);
    }
  };

  // --- Kick Member Handler from List ---
  const kickMemberFromList = async (workspaceId, memberId) => {
    console.log("DEBUG: kickMemberFromList called for workspaceId:", workspaceId, "memberId:", memberId);
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    setIsLoadingKick(true);
    setMessage('');
    setMessageType('');
    try {
      const res = await fetch('http://localhost:5000/api/workspace/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': token },
        body: JSON.stringify({ workspace_id: workspaceId, member_id: memberId })
      });
      const data = await res.json();
      console.log("DEBUG: Kick member response:", data);
      if (res.ok) {
        setMessage(data.message || 'Member removed successfully.');
        setMessageType('success');
        setWorkspaces(prevWorkspaces =>
          prevWorkspaces.map(ws =>
            ws._id === workspaceId
              ? { ...ws, members: ws.members.filter(member => String(member._id) !== String(memberId)) }
              : ws
          )
        );
      } else {
        setMessage(data.message || 'Error removing member.');
        setMessageType('error');
      }
    } catch (error) {
      console.error("DEBUG: Error kicking member:", error);
      setMessage('Network error removing member.');
      setMessageType('error');
    } finally {
      setIsLoadingKick(false);
    }
  };

  // --- Leave Workspace Handler from List ---
  const leaveWorkspaceFromList = async (workspaceId) => {
    console.log("DEBUG: leaveWorkspaceFromList called for workspaceId:", workspaceId);
    if (!window.confirm('Are you sure you want to leave this workspace?')) return;
    setIsLoadingLeave(true);
    setMessage('');
    setMessageType('');
    try {
      const res = await fetch('http://localhost:5000/api/workspace/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': token },
        body: JSON.stringify({ workspace_id: workspaceId })
      });
      const data = await res.json();
      console.log("DEBUG: Leave workspace response:", data);
      if (res.ok) {
        setMessage(data.message || 'Left workspace successfully.');
        setMessageType('success');
        setWorkspaces(prevWorkspaces => prevWorkspaces.filter(ws => ws._id !== workspaceId));
      } else {
        setMessage(data.message || 'Error leaving workspace.');
        setMessageType('error');
      }
    } catch (error) {
      console.error("DEBUG: Error leaving workspace:", error);
      setMessage('Network error leaving workspace.');
      setMessageType('error');
    } finally {
      setIsLoadingLeave(false);
    }
  };

  return (
    <div className="workspace-container">
      <h2>Workspace Management</h2>

      {/* Display Joined Workspaces with Member List */}
      {workspaces.length > 0 && (
        <div className="workspace-list">
          <h3>Your Workspaces</h3>
          {workspaces.map((ws) => {
            console.log("DEBUG: Rendering workspace:", ws);
            console.log("DEBUG: ws.owner:", ws.owner, "currentUserId:", currentUserId, "Comparison:",
              String(ws.owner) === String(currentUserId));
            return (
              <div key={ws.code} className="workspace-card">
                <p><strong>Name:</strong> {ws.name}</p>
                <p><strong>Code:</strong> {ws.code}</p>
                {ws.created_at && (
                  <p><strong>Created At:</strong> {new Date(ws.created_at).toLocaleString()}</p>
                )}
                {ws.members && (
                  <div>
                    <p><strong>Members:</strong> {ws.members.length}</p>
                    <ul className="member-list">
                      {ws.members.map((member) => {
                        console.log("DEBUG: Rendering member:", member);
                        return (
                          <li key={member._id}>
                            {member.email}
                            {String(ws.owner) === String(currentUserId) &&
                              String(member._id) !== String(currentUserId) && (
                                <button
                                  className="kick-btn"
                                  onClick={() => {
                                    console.log("DEBUG: Kick button clicked for member:", member);
                                    kickMemberFromList(ws._id, member._id);
                                  }}
                                  disabled={isLoadingKick}
                                >
                                  {isLoadingKick ? 'Processing...' : 'Kick'}
                                </button>
                              )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <div className="workspace-buttons">
                  <button onClick={() => {
                    console.log("DEBUG: Navigating to chat for workspace:", ws.code);
                    navigate('/workspace-chat/' + ws.code);
                  }}>
      View Details
      </button>

                  {String(ws.owner) === String(currentUserId) && (
                    <button 
                      onClick={() => {
                        console.log("DEBUG: Delete button clicked for workspace:", ws._id);
                        deleteWorkspace(ws._id);
                      }} 
                      disabled={isLoadingDelete}
                      className="delete-btn"
                    >
                      {isLoadingDelete ? 'Deleting...' : 'Delete Workspace'}
                    </button>
                  )}
                  {String(ws.owner) !== String(currentUserId) && (
                    <button 
                      onClick={() => {
                        console.log("DEBUG: Leave button clicked for workspace:", ws._id);
                        leaveWorkspaceFromList(ws._id);
                      }}
                      disabled={isLoadingLeave}
                      className="leave-btn"
                    >
                      {isLoadingLeave ? 'Processing...' : 'Leave Workspace'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Join Actions */}
      {!currentWorkspace && (
        <div className="workspace-actions">
          <div className="workspace-action-card">
            <h3>Create Workspace</h3>
            <div className="input-group">
              <input
                id="ws-name"
                type="text"
                placeholder="Enter New Workspace Name"
                value={workspaceName}
                onChange={e => {
                  console.log("DEBUG: Workspace name changed to:", e.target.value);
                  setWorkspaceName(e.target.value);
                }}
                disabled={isLoadingCreate}
              />
            </div>
            <button
              onClick={() => {
                console.log("DEBUG: Create button clicked");
                createWorkspace();
              }}
              className="create-btn"
              disabled={isLoadingCreate || isLoadingJoin}
            >
              {isLoadingCreate ? 'Creating...' : 'Create'}
            </button>
          </div>

          <div className="workspace-action-card">
            <h3>Join Workspace</h3>
            <div className="input-group">
              <input
                id="ws-code"
                type="text"
                placeholder="Enter Workspace Code"
                value={workspaceCode}
                onChange={e => {
                  console.log("DEBUG: Workspace code changed to:", e.target.value);
                  setWorkspaceCode(e.target.value);
                }}
                disabled={isLoadingJoin}
              />
            </div>
            <button
              onClick={() => {
                console.log("DEBUG: Join button clicked");
                joinWorkspace();
              }}
              className="join-btn"
              disabled={isLoadingJoin || isLoadingCreate}
            >
              {isLoadingJoin ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>
      )}

      {/* Optional Detailed View */}
      {currentWorkspace && (
        <div className="workspace-details current-workspace">
          <h3>Your Workspace Details</h3>
          <p><strong>Name:</strong> {currentWorkspace.name}</p>
          <p><strong>Code:</strong> {currentWorkspace.code}</p>
          {currentWorkspace.created_at && (
            <p><strong>Created At:</strong> {new Date(currentWorkspace.created_at).toLocaleString()}</p>
          )}
          <pre>{JSON.stringify(currentWorkspace, null, 2)}</pre>
          {currentWorkspace.members && currentWorkspace.members.length > 0 ? (
            <div className="members-section">
              <h4>Members</h4>
              <ul>
                {currentWorkspace.members.map((member) => (
                  <li key={member._id}>
                    {member.email}
                    {String(currentWorkspace.owner) === String(currentUserId) &&
                      String(member._id) !== String(currentUserId) && (
                        <button
                          className="kick-btn"
                          onClick={() => {
                            console.log("DEBUG: Kick button clicked in details for member:", member);
                            kickMemberFromList(currentWorkspace._id, member._id);
                          }}
                        >
                          Kick
                        </button>
                      )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>No members found in this workspace.</p>
          )}
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div className={`workspace-message ${messageType}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default Workspace;
