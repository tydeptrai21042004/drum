// src/pages/WorkspaceDetailPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams();        // this is the workspace _id
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const stored = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = stored._id;

  const [workspace, setWorkspace] = useState(null);
  const [msg, setMsg] = useState('');
  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll helper
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // 1) Fetch workspace detail (name, code, owner, members)
  useEffect(() => {
    fetch(`${API}/api/workspace/detail/${workspaceId}`, {
      headers: { 'x-access-token': token }
    })
      .then(r => r.json().then(b => ({ status: r.status, body: b })))
      .then(({ status, body }) => {
        if (status === 200) setWorkspace(body.workspace);
        else setMsg(body.message);
      })
      .catch(() => setMsg('Network error'));
  }, [workspaceId]);

  // 2) Poll chat messages every 3s
  useEffect(() => {
    if (!workspace) return;
    const load = () => {
      fetch(`${API}/api/workspace/chat/${workspaceId}`, {
        headers: { 'x-access-token': token }
      })
        .then(r => r.json())
        .then(d => {
          setMessages(d.messages);
          scrollToBottom();
        });
    };
    load();
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, [workspace, workspaceId]);

  // Kick member
  const kick = memberId => {
    if (!window.confirm('Kick this member?')) return;
    fetch(`${API}/api/workspace/kick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({ workspace_id: workspaceId, member_id: memberId })
    })
      .then(r => r.json().then(b => ({ ok: r.ok, body: b })))
      .then(({ ok, body }) => {
        setMsg(body.message);
        if (ok) {
          setWorkspace(ws => ({
            ...ws,
            members: ws.members.filter(m => m._id !== memberId)
          }));
        }
      });
  };

  // Delete workspace
  const removeWorkspace = () => {
    if (!window.confirm('Delete this workspace?')) return;
    fetch(`${API}/api/workspace/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({ workspace_id: workspaceId })
    })
      .then(r => r.json().then(b => ({ ok: r.ok, body: b })))
      .then(({ ok, body }) => {
        setMsg(body.message);
        if (ok) navigate('/');
      });
  };

  // Send chat
  const handleSendMessage = e => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    fetch(`${API}/api/workspace/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token
      },
      body: JSON.stringify({ workspace_id: workspaceId, message: newMessage })
    }).then(r => {
      if (r.ok) setNewMessage('');
    });
  };

  if (!token) return <p>Please log in to view this page.</p>;
  if (!workspace) return <p>{msg || 'Loading workspace…'}</p>;

  const isOwner = workspace.owner === currentUserId;

  return (
    <div className="workspace-detail-page">
      <header>
        <h1>{workspace.name}</h1>
        <p>Code: {workspace.code}</p>
        {isOwner && (
          <button className="delete-btn" onClick={removeWorkspace}>
            Delete Workspace
          </button>
        )}
      </header>

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
        <div
          className="chat-messages"
          style={{
            height: '300px',
            overflowY: 'scroll',
            border: '1px solid #ccc',
            padding: '10px',
            marginBottom: '10px'
          }}
        >
          {messages.map(msg => (
            <div key={msg._id} className="chat-message" style={{ marginBottom: '8px' }}>
              <strong>{msg.sender_email || msg.sender}:</strong> {msg.message}
              <div style={{ fontSize: '0.8em', color: '#666' }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} style={{ display: 'flex' }}>
          <input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message…"
            style={{ flexGrow: 1, padding: '8px' }}
          />
          <button type="submit" style={{ padding: '8px 12px' }}>
            Send
          </button>
        </form>
      </section>

      {msg && <p className="message">{msg}</p>}
    </div>
  );
}
