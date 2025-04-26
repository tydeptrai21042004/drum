// frontend/src/components/DirectChat.js
import React, { useState, useEffect, useRef } from 'react';

const DirectChat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('token');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch messages from the conversation between the user and admin
  const fetchMessages = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/chat/direct`, {
        headers: { 'x-access-token': token || '' }
      });
      if (response.status === 401) {
        setShowLoginPopup(true);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        scrollToBottom();
      } else {
        console.error('Error fetching direct chat messages');
      }
    } catch (error) {
      console.error('Error fetching direct chat messages:', error);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;
    try {
      const response = await fetch('http://localhost:5000/api/chat/direct/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token || ''
        },
        body: JSON.stringify({
          // For non-admin users, no need to pass receiver_id (backend forces 'admin')
          message: newMessage
        })
      });
      if (response.status === 401) {
        setShowLoginPopup(true);
        return;
      }
      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      } else {
        console.error('Error sending direct message');
      }
    } catch (error) {
      console.error('Error sending direct message:', error);
    }
  };

  if (!token) {
    return <div>Please log in to use Direct Chat.</div>;
  }

  return (
    <div className="direct-chat-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>Direct Chat with Admin</h2>
      <div
        className="chat-messages"
        style={{ height: '400px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}
      >
        {messages.map((msg) => (
          <div key={msg._id} className="chat-message" style={{ marginBottom: '10px' }}>
            <strong>{msg.sender_email || msg.sender}: </strong>
            <span>{msg.message}</span>
            <div style={{ fontSize: '0.8em', color: '#888' }}>
              {new Date(msg.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} style={{ display: 'flex' }}>
        <input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{ flexGrow: 1, padding: '10px' }}
        />
        <button type="submit" style={{ padding: '10px' }}>Send</button>
      </form>
      {showLoginPopup && <div>Please log in to continue chatting.</div>}
    </div>
  );
};

export default DirectChat;
