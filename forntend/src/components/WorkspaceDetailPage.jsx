import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function WorkspaceDetailPage() {
  const { code } = useParams();
  const token = localStorage.getItem('token');
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = storedUser._id;
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(null);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [newChat, setNewChat] = useState('');
  const chatEndRef = useRef(null);

  // Fetch workspace detail
  useEffect(() => {
    fetch(`${API}/api/workspace/detail/${code}`, {
      headers: { 'x-access-token': token }
    })
      .then(res => res.json().then(body => ({ status: res.status, body })))
      .then(({ status, body }) => {
        if (status === 200) setWorkspace(body.workspace);
        else setMessage(body.message);
      })
      .catch(() => setMessage('Network error'));
  }, [code]);

  // Scroll chat to bottom
  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Fetch chat messages every 3s
  useEffect(() => {
    if (!workspace) return;
    const fetchChat = () => {
      fetch(`${API}/api/workspace/chat/${workspace._id}`, {
        headers: { 'x-access-token': token }
      })
        .then(r => r.json())
        .then(data => {
          setChatMessages(data.messages);
          scrollToBottom();
        });
    };
    fetchChat();
    const iv = setInterval(fetchChat, 3000);
    return () => clearInterval(iv);
  }, [workspace]);

  // Kick member
  const kick = (memberId) => {
    if (!window.confirm('Kick this member?')) return;
    fetch(`${API}/api/workspace/kick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({ workspace_id: workspace._id, member_id: memberId })
    })
      .then(r => r.json().then(b => ({ status: r.status, body: b })))
      .then(({ status, body }) => {
        setMessage(body.message);
        if (status === 200) {
          setWorkspace(ws => ({
            ...ws,
            members: ws.members.filter(m => m._id !== memberId)
          }));
        }
      });
  };

  // Delete workspace
  const deleteWorkspace = () => {
    if (!window.confirm('Delete this workspace?')) return;
    fetch(`${API}/api/workspace/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({ workspace_id: workspace._id })
    })
      .then(r => r.json().then(b => ({ status: r.status, body: b })))
      .then(({ status, body }) => {
        setMessage(body.message);
        if (status === 200) navigate('/');
      });
  };

  // Send chat
  const sendChat = (e) => {
    e.preventDefault();
    if (!newChat.trim()) return;
    fetch(`${API}/api/workspace/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({ workspace_id: workspace._id, message: newChat })
    }).then(r => {
      if (r.ok) {
        setNewChat('');
      }
    });
  };

  if (!workspace) return <p>{message || 'Loading...'}</p>;

  const isOwner = workspace.owner === currentUserId;

  return (
    <div className="workspace-detail-page">
      <h1>{workspace.name}</h1>
      <p><strong>Code:</strong> {workspace.code}</p>
      {isOwner && (
        <button className="delete-btn" onClick={deleteWorkspace}>
          Delete Workspace
        </button>
      )}

      <section className="members">
        <h2>Members</h2>
        <ul>
          {workspace.members.map(m => (
            <li key={m._id}>
              {m.email}
              {isOwner && m._id !== currentUserId && (
                <button onClick={() => kick(m._id)}>Kick</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="chat">
        <h2>Chat</h2>
        <div className="chat-window">
          {chatMessages.map(msg => (
            <div key={msg._id} className="chat-message">
              <strong>{msg.sender_email || msg.sender}:</strong> {msg.message}
              <div className="timestamp">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={sendChat} className="chat-form">
          <input
            value={newChat}
            onChange={e => setNewChat(e.target.value)}
            placeholder="Type a message…"
          />
          <button type="submit">Send</button>
        </form>
      </section>

      {message && <p className="message">{message}</p>}
    </div>
  );
}
