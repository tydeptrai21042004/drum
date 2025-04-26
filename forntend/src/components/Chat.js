// frontend/src/components/Chat.js
import React, { useState, useEffect, useRef } from 'react';

const Chat = ({ receiverId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [popupEmail, setPopupEmail] = useState('');
  const [popupPassword, setPopupPassword] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // Retrieve token and role from localStorage
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || 'user';
  
  // For regular users, force receiver to "admin"
  // For admins, use the passed-in receiverId (so they can reply to a specific user)
  const targetReceiverId = role === 'admin' ? receiverId : 'admin';

  // Function to scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chat messages between the logged-in user and the targetReceiverId
  const fetchChatMessages = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/chat/${targetReceiverId}`, {
        headers: { 'x-access-token': token || '' }
      });
      if (response.status === 401) {
        // If unauthorized, show the login popup
        setShowLoginPopup(true);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        scrollToBottom();
      } else {
        console.error('Error fetching chat messages');
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  };

  // Poll for messages every 3 seconds
  useEffect(() => {
    fetchChatMessages();
    const interval = setInterval(fetchChatMessages, 3000);
    return () => clearInterval(interval);
  }, [targetReceiverId]);

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;
    try {
      const response = await fetch('http://localhost:5000/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': token || ''
        },
        body: JSON.stringify({
          receiver_id: targetReceiverId,
          message: newMessage
        })
      });
      if (response.status === 401) {
        setShowLoginPopup(true);
        return;
      }
      if (response.ok) {
        setNewMessage('');
        fetchChatMessages();
      } else {
        console.error('Error sending message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle login popup form submission
  const handlePopupLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: popupEmail, password: popupPassword })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setShowLoginPopup(false);
        setPopupMessage('');
        // Once logged in, fetch messages again
        fetchChatMessages();
      } else {
        setPopupMessage(data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error("Login error in popup:", error);
      setPopupMessage('An error occurred during login. Please try again.');
    }
  };

  // If there's no token at all, show the login popup immediately
  if (!token) {
    return (
      <div style={styles.overlay}>
        <div style={styles.popup}>
          <h2>Please Login</h2>
          <p>You must be logged in to access the chat.</p>
          <form onSubmit={handlePopupLogin}>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="email"
                placeholder="Email"
                value={popupEmail}
                onChange={(e) => setPopupEmail(e.target.value)}
                required
                style={{ padding: '8px', width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="password"
                placeholder="Password"
                value={popupPassword}
                onChange={(e) => setPopupPassword(e.target.value)}
                required
                style={{ padding: '8px', width: '100%' }}
              />
            </div>
            {popupMessage && (
              <p style={{ color: 'red', marginBottom: '10px' }}>{popupMessage}</p>
            )}
            <button type="submit" style={styles.button}>
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>{role === 'admin' ? 'Admin Chat Room' : 'Chat with Admin'}</h2>
      <div 
        className="chat-messages" 
        style={{ 
          height: '400px', 
          overflowY: 'scroll', 
          border: '1px solid #ccc', 
          padding: '10px', 
          marginBottom: '10px' 
        }}
      >
        {messages.map((msg) => (
          <div key={msg._id} className="chat-message" style={{ marginBottom: '10px' }}>
            <strong>{msg.sender_email || msg.sender}: </strong>
            <span>{msg.message}</span>
            <div className="chat-timestamp" style={{ fontSize: '0.8em', color: '#888' }}>
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

      {showLoginPopup && (
        <div style={styles.overlay}>
          <div style={styles.popup}>
            <h2>Please Login</h2>
            <form onSubmit={handlePopupLogin}>
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={popupEmail}
                  onChange={(e) => setPopupEmail(e.target.value)}
                  required
                  style={{ padding: '8px', width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="password"
                  placeholder="Password"
                  value={popupPassword}
                  onChange={(e) => setPopupPassword(e.target.value)}
                  required
                  style={{ padding: '8px', width: '100%' }}
                />
              </div>
              {popupMessage && (
                <p style={{ color: 'red', marginBottom: '10px' }}>{popupMessage}</p>
              )}
              <button type="submit" style={styles.button}>
                Login
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  popup: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '5px',
    width: '300px',
    textAlign: 'center'
  },
  button: {
    padding: '10px 20px',
    cursor: 'pointer'
  }
};

export default Chat;
