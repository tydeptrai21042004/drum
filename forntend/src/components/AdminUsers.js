// frontend/src/components/AdminUsers.js
import React, { useState, useEffect } from 'react';
import './AdminUsers.css'; // Ensure this CSS file is imported

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [chats, setChats] = useState([]);
    const [workspaces, setWorkspaces] = useState([]);
    const [error, setError] = useState('');
    const [chatsError, setChatsError] = useState('');
    const [workspacesError, setWorkspacesError] = useState('');
    const [replyReceiverId, setReplyReceiverId] = useState('');
    const [replyMessage, setReplyMessage] = useState('');
    const [replyStatus, setReplyStatus] = useState(''); // Can be success or error message
    const [isReplyError, setIsReplyError] = useState(false); // Track if reply status is an error
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchUsers = async () => {
            setError('');
            try {
                const response = await fetch('http://localhost:5000/api/admin/users', {
                    headers: { 'x-access-token': token || '' }
                });
                if (response.status === 401 || response.status === 403) {
                    setError('You are not authorized to view this page.');
                    setUsers([]);
                    return;
                }
                if (response.ok) {
                    const data = await response.json();
                    // Ensure users are sorted, e.g., by creation date descending
                    const sortedUsers = (data.users || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    setUsers(sortedUsers);
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.message || 'Failed to fetch users.');
                }
            } catch (err) {
                console.error('Error fetching users:', err);
                setError('An error occurred while fetching users.');
            }
        };

        const fetchChats = async () => {
            setChatsError('');
            try {
                const response = await fetch('http://localhost:5000/api/admin/chats', {
                    headers: { 'x-access-token': token || '' }
                });
                if (response.status === 401 || response.status === 403) {
                    setChatsError('You are not authorized to view direct chats.');
                    setChats([]);
                    return;
                }
                if (response.ok) {
                    const data = await response.json();
                     // Ensure chats are sorted, e.g., by timestamp descending
                    const sortedChats = (data.chats || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    setChats(sortedChats);
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    setChatsError(errorData.message || 'Failed to fetch chats.');
                }
            } catch (err) {
                console.error('Error fetching chats:', err);
                setChatsError('An error occurred while fetching chats.');
            }
        };

        const fetchWorkspaces = async () => {
            setWorkspacesError('');
            try {
                const response = await fetch('http://localhost:5000/api/admin/workspaces', {
                    headers: { 'x-access-token': token || '' }
                });
                if (response.status === 401 || response.status === 403) {
                    setWorkspacesError('You are not authorized to view workspaces.');
                    setWorkspaces([]);
                    return;
                }
                if (response.ok) {
                    const data = await response.json();
                     // Ensure workspaces are sorted, e.g., by creation date descending
                    const sortedWorkspaces = (data.workspaces || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    setWorkspaces(sortedWorkspaces);
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    setWorkspacesError(errorData.message || 'Failed to fetch workspaces.');
                }
            } catch (err) {
                console.error('Error fetching workspaces:', err);
                setWorkspacesError('An error occurred while fetching workspaces.');
            }
        };

        if (token) {
            fetchUsers();
            fetchChats();
            fetchWorkspaces();
        } else {
            setError('Authentication token not found. Please log in.');
            // Clear all data if no token
            setUsers([]);
            setChats([]);
            setWorkspaces([]);
        }
    }, [token]);

    // Function to handle admin reply
    const handleReplySubmit = async (e) => {
        e.preventDefault();
        setReplyStatus('');
        setIsReplyError(false);
        if (!replyReceiverId || !replyMessage.trim()) {
            setReplyStatus('Please select a receiver and type a message.');
            setIsReplyError(true);
            return;
        }
        try {
            const res = await fetch('http://localhost:5000/api/chat/admin/direct/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-access-token': token
                },
                body: JSON.stringify({
                    receiver_id: replyReceiverId,
                    message: replyMessage.trim()
                })
            });
            const data = await res.json();
            if (res.ok) {
                setReplyStatus(data.message || 'Reply sent successfully.');
                setIsReplyError(false);
                setReplyMessage(''); // Clear message input on success
                // Optionally clear receiver selection or keep it
                // setReplyReceiverId('');
                 // TODO: Optionally re-fetch chats to show the new message immediately
                // fetchChats();
            } else {
                setReplyStatus(data.message || 'Failed to send reply.');
                setIsReplyError(true);
            }
        } catch (err) {
            console.error('Error sending reply:', err);
            setReplyStatus('An error occurred while sending reply.');
            setIsReplyError(true);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    };


    return (
        <div className="admin-container">
            <h1>Admin Dashboard</h1>

            {/* Users Section */}
            <div className="admin-section">
                <h2>All Users</h2>
                {error && <p className="admin-error-message">{error}</p>}
                {!error && (
                    <div className="table-responsive-wrapper">
                        {users.length > 0 ? (
                            <table className="admin-table admin-users-table">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Created At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user._id}>
                                            <td data-label="Email">{user.email}</td>
                                            <td data-label="Role">{user.role}</td>
                                            <td data-label="Created At">{formatDate(user.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             <p className="admin-info-message">No users found.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Direct Chats Section */}
            <div className="admin-section">
                <h2>Direct Chats</h2>
                {chatsError && <p className="admin-error-message">{chatsError}</p>}

                 {/* Admin Reply Form */}
                 {!chatsError && ( // Show form only if chats aren't blocked by auth error
                 <div className="admin-reply-form-container">
                     <h3>Send Direct Reply to User</h3>
                     <form onSubmit={handleReplySubmit} className="admin-reply-form">
                         <div className="form-group">
                             <label htmlFor="reply-receiver">Select Receiver:</label>
                             <select
                                 id="reply-receiver"
                                 value={replyReceiverId}
                                 onChange={(e) => setReplyReceiverId(e.target.value)}
                                 required // Make selection mandatory
                             >
                                 <option value="">-- Select User --</option>
                                 {users
                                     .filter((user) => user.role !== 'admin') // Filter out admins
                                     .map((user) => (
                                         <option key={user._id} value={user._id}>
                                             {user.email} ({user._id}) {/* Show email and ID */}
                                         </option>
                                     ))}
                             </select>
                         </div>
                         <div className="form-group">
                             <label htmlFor="reply-message">Message:</label>
                             <textarea
                                 id="reply-message"
                                 value={replyMessage}
                                 onChange={(e) => setReplyMessage(e.target.value)}
                                 placeholder="Type your reply here..."
                                 rows="4" // Increase default size
                                 required // Make message mandatory
                             />
                         </div>
                         <button type="submit" className="admin-button admin-button-primary">Send Reply</button>
                     </form>
                     {replyStatus && (
                        <p className={`reply-status ${isReplyError ? 'error' : 'success'}`}>
                            {replyStatus}
                        </p>
                     )}
                 </div>
                 )}

                {!chatsError && (
                    <div className="table-responsive-wrapper">
                        {chats.length > 0 ? (
                            <table className="admin-table admin-chats-table">
                                <thead>
                                    <tr>
                                        <th>Sender</th>
                                        <th>Receiver ID</th>
                                        <th>Message</th>
                                        <th>Sent At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chats.map((chat) => (
                                        <tr key={chat._id}>
                                            {/* Assuming sender_email might be available */}
                                            <td data-label="Sender">{chat.sender_email || chat.sender}</td>
                                            {/* Assuming receiver might be just an ID */}
                                            <td data-label="Receiver ID">{chat.receiver}</td>
                                            <td data-label="Message">{chat.message}</td>
                                            <td data-label="Sent At">{formatDate(chat.timestamp)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="admin-info-message">No direct chats found.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Workspaces Section */}
            <div className="admin-section">
                <h2>All Workspaces</h2>
                {workspacesError && <p className="admin-error-message">{workspacesError}</p>}
                {!workspacesError && (
                    <div className="table-responsive-wrapper">
                        {workspaces.length > 0 ? (
                            <table className="admin-table admin-workspaces-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Code</th>
                                        <th>Owner ID</th>
                                        <th>Created At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workspaces.map((ws) => (
                                        <tr key={ws._id}>
                                            <td data-label="Name">{ws.name}</td>
                                            <td data-label="Code">{ws.code}</td>
                                             {/* Assuming owner is an ID */}
                                            <td data-label="Owner ID">{ws.owner}</td>
                                            <td data-label="Created At">{formatDate(ws.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             <p className="admin-info-message">No workspaces found.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminUsers;